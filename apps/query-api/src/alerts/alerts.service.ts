import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, type FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { z } from 'zod';
import { AlertEntity } from '@telemetry/database';

export const AlertsQuerySchema = z.object({
  device: z.string().min(1).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
});

export type AlertsQuery = z.infer<typeof AlertsQuerySchema>;

export interface AlertSummary {
  id: string;
  rule_id: string;
  device_id: string;
  severity: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  triggered_at: string;
}

@Injectable()
export class AlertsService {
  constructor(@InjectRepository(AlertEntity) private readonly alerts: Repository<AlertEntity>) {}

  async findAll(query: AlertsQuery): Promise<AlertSummary[]> {
    const where: FindOptionsWhere<AlertEntity> = {};
    if (query.device) {
      where.deviceId = query.device;
    }
    if (query.from && query.to) {
      where.triggeredAt = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.triggeredAt = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.triggeredAt = LessThanOrEqual(new Date(query.to));
    }
    const rows = await this.alerts.find({ where, order: { triggeredAt: 'DESC' }, take: query.limit });
    return rows.map((row) => this.toSummary(row));
  }

  private toSummary(row: AlertEntity): AlertSummary {
    return {
      id: row.id,
      rule_id: row.ruleId,
      device_id: row.deviceId,
      severity: row.severity,
      metric: row.metric,
      value: Number(row.value),
      threshold: Number(row.threshold),
      message: row.message,
      triggered_at: row.triggeredAt.toISOString(),
    };
  }
}
