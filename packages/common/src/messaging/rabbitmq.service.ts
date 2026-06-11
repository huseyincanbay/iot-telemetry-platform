import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { TELEMETRY_DLX, TELEMETRY_EXCHANGE } from '@telemetry/types';

export type MessageHandler = (payload: unknown) => Promise<void> | void;

@Injectable()
export class RabbitMqService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('RABBITMQ_URL');
    this.connection = await amqp.connect(url);
    this.connection.on('error', (error: Error) => this.logger.error(`connection error: ${error.message}`));
    this.connection.on('close', () => this.logger.warn('connection closed'));
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(TELEMETRY_EXCHANGE, 'topic', { durable: true });
    await this.channel.assertExchange(TELEMETRY_DLX, 'topic', { durable: true });
    this.logger.log(`connected; exchange '${TELEMETRY_EXCHANGE}' ready`);
  }

  publish(routingKey: string, message: unknown): void {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }
    this.channel.publish(TELEMETRY_EXCHANGE, routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async consume(queue: string, routingKey: string, handler: MessageHandler): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }
    const deadLetterQueue = `${queue}.dlq`;
    await this.channel.assertQueue(queue, { durable: true, deadLetterExchange: TELEMETRY_DLX });
    await this.channel.bindQueue(queue, TELEMETRY_EXCHANGE, routingKey);
    await this.channel.assertQueue(deadLetterQueue, { durable: true });
    await this.channel.bindQueue(deadLetterQueue, TELEMETRY_DLX, routingKey);
    await this.channel.prefetch(1);

    await this.channel.consume(queue, (message) => {
      if (message) {
        void this.handleMessage(queue, message, handler);
      }
    });
    this.logger.log(`consuming '${queue}' bound to '${routingKey}'`);
  }

  private async handleMessage(queue: string, message: amqp.ConsumeMessage, handler: MessageHandler): Promise<void> {
    try {
      const payload: unknown = JSON.parse(message.content.toString());
      await handler(payload);
      this.channel?.ack(message);
    } catch (error) {
      this.logger.error(`handler failed on '${queue}', dead-lettering: ${(error as Error).message}`);
      this.channel?.nack(message, false, false);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
