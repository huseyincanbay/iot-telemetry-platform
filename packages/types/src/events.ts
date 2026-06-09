import type { AlertSeverity } from './enums';
import type { Telemetry, TelemetryMetric } from './telemetry';

export const TELEMETRY_EXCHANGE = 'telemetry.events';
export const TELEMETRY_DLX = 'telemetry.events.dlx';

export const RoutingKey = {
  TelemetryReceived: 'telemetry.received',
  AlertTriggered: 'alert.triggered',
} as const;
export type RoutingKey = (typeof RoutingKey)[keyof typeof RoutingKey];

export const Queue = {
  RuleEngineTelemetry: 'rule-engine.telemetry',
  NotificationAlerts: 'notification.alerts',
} as const;
export type Queue = (typeof Queue)[keyof typeof Queue];

export interface TelemetryReceivedEvent {
  telemetry: Telemetry;
  ingestedAt: string;
}

export interface AlertTriggeredEvent {
  ruleId: string;
  deviceId: string;
  severity: AlertSeverity;
  metric: TelemetryMetric | 'connectivity';
  value: number;
  threshold: number;
  message: string;
  triggeredAt: string;
}
