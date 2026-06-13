import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { MetricsModule, pinoOptions, RabbitMqModule, RedisModule, validateEnv } from '@telemetry/common';
import { DatabaseModule } from '@telemetry/database';
import { SERVICE_NAME } from './app.constants';
import { envSchema } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { RuleEngineModule } from './rules/rule-engine.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      validate: validateEnv(envSchema),
    }),
    LoggerModule.forRoot(pinoOptions({ serviceName: SERVICE_NAME })),
    ScheduleModule.forRoot(),
    MetricsModule,
    RedisModule,
    RabbitMqModule,
    DatabaseModule.forRoot(),
    RuleEngineModule,
    HealthModule,
  ],
})
export class AppModule {}
