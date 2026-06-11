import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMqService } from '@telemetry/common';
import { AlertEntity } from '@telemetry/database';
import { type AlertTriggeredEvent, Queue, RoutingKey } from '@telemetry/types';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private readonly webhookUrl?: string;

  constructor(
    config: ConfigService,
    private readonly rabbit: RabbitMqService,
    @InjectRepository(AlertEntity) private readonly alerts: Repository<AlertEntity>,
  ) {
    this.webhookUrl = config.get<string>('WEBHOOK_URL');
  }

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume(Queue.NotificationAlerts, RoutingKey.AlertTriggered, (payload) =>
      this.handleAlert(payload),
    );
  }

  private async handleAlert(payload: unknown): Promise<void> {
    const alert = payload as AlertTriggeredEvent;
    this.logger.warn(
      `ALERT [${alert.severity}] ${alert.ruleId} device=${alert.deviceId} ${alert.metric}=${alert.value} threshold=${alert.threshold}`,
    );
    await this.alerts.insert({
      ruleId: alert.ruleId,
      deviceId: alert.deviceId,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      message: alert.message,
      triggeredAt: new Date(alert.triggeredAt),
    });
    void this.deliverWebhook(alert);
  }

  private async deliverWebhook(alert: AlertTriggeredEvent): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      this.logger.warn(`webhook delivery failed: ${(error as Error).message}`);
    }
  }
}
