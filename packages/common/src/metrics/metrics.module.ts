import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { collectDefaultMetrics, Registry } from 'prom-client';
import { HttpMetricsInterceptor } from '../interceptors/http-metrics.interceptor';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    {
      provide: Registry,
      useFactory: (): Registry => {
        const registry = new Registry();
        collectDefaultMetrics({ register: registry });
        return registry;
      },
    },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
  exports: [Registry],
})
export class MetricsModule {}
