import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqService, RedisService } from '@telemetry/common';
import {
  type AlertTriggeredEvent,
  Queue,
  RoutingKey,
  type Telemetry,
  type TelemetryReceivedEvent,
} from '@telemetry/types';
import { evaluateRule, type Rule, RulesSchema } from './rule.schema';

interface BreachState {
  breachStartMs: number;
  fired: boolean;
}

@Injectable()
export class RuleEngineService implements OnModuleInit {
  private readonly logger = new Logger(RuleEngineService.name);
  private rules: Rule[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly rabbit: RabbitMqService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.rules = this.loadRules();
    this.logger.log(`loaded ${this.rules.length} rules`);
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
    for (const rule of this.rules) {
      await this.evaluate(rule, telemetry);
    }
  }

  private async evaluate(rule: Rule, telemetry: Telemetry): Promise<void> {
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

  private fireAlert(rule: Rule, telemetry: Telemetry, value: number, threshold: number): void {
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
    this.logger.warn(`alert '${rule.id}' (${rule.severity}) for ${telemetry.device_id}: ${rule.metric}=${value}`);
  }
}
