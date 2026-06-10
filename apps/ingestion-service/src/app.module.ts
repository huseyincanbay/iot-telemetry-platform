import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { pinoOptions, RedisModule, validateEnv } from '@telemetry/common';
import { DatabaseModule } from '@telemetry/database';
import { SERVICE_NAME } from './app.constants';
import { envSchema } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      validate: validateEnv(envSchema),
    }),
    LoggerModule.forRoot(pinoOptions({ serviceName: SERVICE_NAME })),
    DatabaseModule.forRoot(),
    RedisModule,
    IngestionModule,
    HealthModule,
  ],
})
export class AppModule {}
