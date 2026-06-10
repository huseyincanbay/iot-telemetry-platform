import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@telemetry/common';
import { deviceShadowKey, type Telemetry } from '@telemetry/types';

@Injectable()
export class DeviceShadowService {
  private readonly logger = new Logger(DeviceShadowService.name);

  constructor(private readonly redis: RedisService) {}

  async update(readings: Telemetry[]): Promise<void> {
    if (readings.length === 0) {
      return;
    }
    try {
      const pipeline = this.redis.client.pipeline();
      for (const reading of readings) {
        pipeline.set(deviceShadowKey(reading.device_id), JSON.stringify(reading));
      }
      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`device shadow update failed: ${(error as Error).message}`);
    }
  }
}
