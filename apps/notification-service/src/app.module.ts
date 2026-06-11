import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { MetricsModule, pinoOptions, RabbitMqModule, validateEnv } from '@telemetry/common';
import { DatabaseModule } from '@telemetry/database';
import { SERVICE_NAME } from './app.constants';
import { envSchema } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { NotificationModule } from './notifications/notification.module';

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
    RabbitMqModule,
    NotificationModule,
    HealthModule,
  ],
})
export class AppModule {}
