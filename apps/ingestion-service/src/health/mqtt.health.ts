import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { MqttSubscriber } from '../ingestion/mqtt.subscriber';

@Injectable()
export class MqttHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly subscriber: MqttSubscriber,
  ) {}

  isHealthy(key: string): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check(key);
    return this.subscriber.isConnected() ? indicator.up() : indicator.down();
  }
}
