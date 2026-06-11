import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { MetricsModule, pinoOptions, RedisModule, validateEnv } from '@telemetry/common';
import { DatabaseModule } from '@telemetry/database';
import { SERVICE_NAME } from './app.constants';
import { envSchema } from './config/env.schema';
import { AlertsModule } from './alerts/alerts.module';
import { DevicesModule } from './devices/devices.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      validate: validateEnv(envSchema),
    }),
    LoggerModule.forRoot(pinoOptions({ serviceName: SERVICE_NAME })),
    MetricsModule,
    DatabaseModule.forRoot(),
    RedisModule,
    AlertsModule,
    DevicesModule,
    HealthModule,
  ],
})
export class AppModule {}
