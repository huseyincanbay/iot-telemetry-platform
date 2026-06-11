import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class IngestionMetrics {
  private readonly ingested: Counter<string>;
  private readonly lag: Histogram<string>;
  private readonly dropped: Counter<string>;

  constructor(registry: Registry) {
    this.ingested = new Counter({
      name: 'telemetry_ingested_total',
      help: 'Total telemetry readings ingested',
      labelNames: ['device_id'],
      registers: [registry],
    });
    this.lag = new Histogram({
      name: 'telemetry_ingestion_lag_seconds',
      help: 'Delay between a reading timestamp and its ingestion',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [registry],
    });
    this.dropped = new Counter({
      name: 'telemetry_mqtt_dropped_total',
      help: 'Total MQTT messages dropped before ingestion',
      labelNames: ['reason'],
      registers: [registry],
    });
  }

  recordIngested(deviceId: string, lagSeconds: number): void {
    this.ingested.inc({ device_id: deviceId });
    this.lag.observe(lagSeconds);
  }

  recordDropped(reason: string): void {
    this.dropped.inc({ reason });
  }
}
