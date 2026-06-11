import { Injectable } from '@nestjs/common';
import { Counter, Registry } from 'prom-client';

@Injectable()
export class RuleEngineMetrics {
  private readonly evaluations: Counter<string>;
  private readonly alerts: Counter<string>;

  constructor(registry: Registry) {
    this.evaluations = new Counter({
      name: 'telemetry_rule_evaluations_total',
      help: 'Total rule evaluations',
      labelNames: ['rule_id'],
      registers: [registry],
    });
    this.alerts = new Counter({
      name: 'telemetry_alerts_triggered_total',
      help: 'Total alerts triggered',
      labelNames: ['rule_id', 'severity'],
      registers: [registry],
    });
  }

  recordEvaluation(ruleId: string): void {
    this.evaluations.inc({ rule_id: ruleId });
  }

  recordAlert(ruleId: string, severity: string): void {
    this.alerts.inc({ rule_id: ruleId, severity });
  }
}
