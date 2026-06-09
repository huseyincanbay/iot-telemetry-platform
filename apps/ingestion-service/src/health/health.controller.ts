import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { MqttHealthIndicator } from './mqtt.health';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly mqtt: MqttHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.mqtt.isHealthy('mqtt'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
