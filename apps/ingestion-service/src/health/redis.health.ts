import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redis: RedisService,
  ) {}

  isHealthy(key: string): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check(key);
    return this.redis.isReady() ? indicator.up() : indicator.down();
  }
}
