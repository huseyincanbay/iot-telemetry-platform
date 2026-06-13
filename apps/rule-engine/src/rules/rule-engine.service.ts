import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMqService, RedisService } from '@telemetry/common';
import { DeviceEntity } from '@telemetry/database';
import {
  type AlertTriggeredEvent,
  Queue,
  RoutingKey,
  type Telemetry,
  type TelemetryReceivedEvent,
} from '@telemetry/types';
import {
  type ConnectivityRule,
  evaluateRule,
  type Rule,
  RulesSchema,
  type ThresholdRule,
} from './rule.schema';
import { RuleEngineMetrics } from './rule-engine.metrics';

interface BreachState {
  breachStartMs: number;
  fired: boolean;
}

const OFFLINE_SWEEP_INTERVAL_MS = 30000;

@Injectable()
export class RuleEngineService implements OnModuleInit {
  private readonly logger = new Logger(RuleEngineService.name);
  private thresholdRules: ThresholdRule[] = [];
  private connectivityRules: ConnectivityRule[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly rabbit: RabbitMqService,
    private readonly redis: RedisService,
    private readonly metrics: RuleEngineMetrics,
    @InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const rules = this.loadRules();
    this.thresholdRules = rules.filter((rule): rule is ThresholdRule => rule.kind === 'threshold');
    this.connectivityRules = rules.filter((rule): rule is ConnectivityRule => rule.kind === 'connectivity');
    this.logger.log(
      `loaded ${this.thresholdRules.length} threshold + ${this.connectivityRules.length} connectivity rules`,
    );
    await this.rabbit.consume(Queue.RuleEngineTelemetry, RoutingKey.TelemetryReceived, (payload) =>
      this.handleTelemetry(payload),
    );
  }

  private loadRules(): Rule[] {
    const path = this.config.get<string>('RULES_PATH') ?? join(process.cwd(), 'config', 'rules.json');
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return RulesSchema.parse(raw);
  }

  private async handleTelemetry(payload: unknown): Promise<void> {
    const { telemetry } = payload as TelemetryReceivedEvent;
    for (const rule of this.thresholdRules) {
      await this.evaluate(rule, telemetry);
    }
  }

  private async evaluate(rule: ThresholdRule, telemetry: Telemetry): Promise<void> {
    this.metrics.recordEvaluation(rule.id);
    const value = telemetry[rule.metric];
    const { breaching, threshold } = evaluateRule(rule, value);
    const key = `rule:${rule.id}:${telemetry.device_id}`;

    if (!breaching) {
      await this.redis.client.del(key);
      return;
    }

    const readingMs = new Date(telemetry.timestamp).getTime();
    const existing = await this.redis.client.get(key);
    const state: BreachState = existing
      ? (JSON.parse(existing) as BreachState)
      : { breachStartMs: readingMs, fired: false };

    if (!state.fired && readingMs - state.breachStartMs >= rule.sustainSeconds * 1000) {
      this.fireAlert(rule, telemetry, value, threshold);
      state.fired = true;
    }
    await this.redis.client.set(key, JSON.stringify(state));
  }

  private fireAlert(rule: ThresholdRule, telemetry: Telemetry, value: number, threshold: number): void {
    const alert: AlertTriggeredEvent = {
      ruleId: rule.id,
      deviceId: telemetry.device_id,
      severity: rule.severity,
      metric: rule.metric,
      value,
      threshold,
      message: rule.message,
      triggeredAt: telemetry.timestamp,
    };
    this.rabbit.publish(RoutingKey.AlertTriggered, alert);
    this.metrics.recordAlert(rule.id, rule.severity);
    this.logger.warn(`alert '${rule.id}' (${rule.severity}) for ${telemetry.device_id}: ${rule.metric}=${value}`);
  }

  @Interval(OFFLINE_SWEEP_INTERVAL_MS)
  async sweepConnectivity(): Promise<void> {
    if (this.connectivityRules.length === 0) {
      return;
    }
    try {
      const devices = await this.devices.find();
      const nowMs = Date.now();
      for (const rule of this.connectivityRules) {
        for (const device of devices) {
          await this.evaluateConnectivity(rule, device, nowMs);
        }
      }
    } catch (error) {
      this.logger.error(`connectivity sweep failed: ${(error as Error).message}`);
    }
  }

  private async evaluateConnectivity(rule: ConnectivityRule, device: DeviceEntity, nowMs: number): Promise<void> {
    const lastSeenMs = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
    const silentSeconds = Math.floor((nowMs - lastSeenMs) / 1000);
    const key = `connectivity:${rule.id}:${device.deviceId}`;

    if (silentSeconds < rule.silenceSeconds) {
      await this.redis.client.del(key);
      return;
    }

    const alreadyFired = await this.redis.client.get(key);
    if (alreadyFired) {
      return;
    }
    this.fireConnectivityAlert(rule, device.deviceId, silentSeconds);
    await this.redis.client.set(key, '1');
  }

  private fireConnectivityAlert(rule: ConnectivityRule, deviceId: string, silentSeconds: number): void {
    const alert: AlertTriggeredEvent = {
      ruleId: rule.id,
      deviceId,
      severity: rule.severity,
      metric: 'connectivity',
      value: silentSeconds,
      threshold: rule.silenceSeconds,
      message: rule.message,
      triggeredAt: new Date().toISOString(),
    };
    this.rabbit.publish(RoutingKey.AlertTriggered, alert);
    this.metrics.recordAlert(rule.id, rule.severity);
    this.logger.warn(`alert '${rule.id}' (${rule.severity}) for ${deviceId}: offline ${silentSeconds}s`);
  }
}
