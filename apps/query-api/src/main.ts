import 'reflect-metadata';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from '@telemetry/common';
import { AppModule } from './app.module';
import { DEFAULT_GRPC_URL, DEFAULT_PORT, SERVICE_NAME } from './app.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', DEFAULT_PORT);
  const grpcUrl = config.get<string>('GRPC_URL', DEFAULT_GRPC_URL);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'telemetry',
      protoPath: join(process.cwd(), '../../proto/telemetry.proto'),
      url: grpcUrl,
      loader: { keepCase: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`${SERVICE_NAME} listening on http://0.0.0.0:${port}`, 'Bootstrap');
  logger.log(`${SERVICE_NAME} gRPC listening on ${grpcUrl}`, 'Bootstrap');
}

void bootstrap();
