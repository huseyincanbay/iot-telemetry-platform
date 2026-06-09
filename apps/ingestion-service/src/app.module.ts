import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { pinoOptions, validateEnv } from '@telemetry/common';
import { SERVICE_NAME } from './app.constants';
import { envSchema } from './config/env.schema';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv(envSchema),
    }),
    LoggerModule.forRoot(pinoOptions({ serviceName: SERVICE_NAME })),
    HealthModule,
  ],
})
export class AppModule {}
