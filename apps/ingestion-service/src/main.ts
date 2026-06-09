import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from '@telemetry/common';
import { AppModule } from './app.module';
import { DEFAULT_PORT, SERVICE_NAME } from './app.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', DEFAULT_PORT);

  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`${SERVICE_NAME} listening on http://0.0.0.0:${port}`, 'Bootstrap');
}

void bootstrap();
