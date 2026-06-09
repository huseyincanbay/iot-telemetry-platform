import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
    this.client.on('error', (error) => {
      this.logger.warn(`redis error: ${error.message}`);
    });
  }

  isReady(): boolean {
    return this.client.status === 'ready';
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
