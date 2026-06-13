import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { TELEMETRY_DLX, TELEMETRY_EXCHANGE } from '@telemetry/types';

export type MessageHandler = (payload: unknown) => Promise<void> | void;

interface ConsumerRegistration {
  queue: string;
  routingKey: string;
  handler: MessageHandler;
}

const BASE_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;

@Injectable()
export class RabbitMqService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;
  private readonly consumers: ConsumerRegistration[] = [];
  private reconnectDelayMs = BASE_RECONNECT_DELAY_MS;
  private reconnecting = false;
  private closing = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.establish();
    } catch (error) {
      this.logger.error(`initial connect failed: ${(error as Error).message}; scheduling reconnect`);
      this.scheduleReconnect();
    }
  }

  publish(routingKey: string, message: unknown): void {
    if (!this.channel) {
      this.logger.warn(`publish skipped, not connected: ${routingKey}`);
      return;
    }
    try {
      this.channel.publish(TELEMETRY_EXCHANGE, routingKey, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: 'application/json',
      });
    } catch (error) {
      this.logger.warn(`publish failed on '${routingKey}': ${(error as Error).message}`);
    }
  }

  async consume(queue: string, routingKey: string, handler: MessageHandler): Promise<void> {
    const registration: ConsumerRegistration = { queue, routingKey, handler };
    this.consumers.push(registration);
    if (this.channel) {
      await this.setupConsumer(registration);
    }
  }

  private async establish(): Promise<void> {
    const url = this.config.getOrThrow<string>('RABBITMQ_URL');
    const connection = await amqp.connect(url);
    connection.on('error', (error: Error) => this.logger.error(`connection error: ${error.message}`));
    connection.on('close', () => this.handleClose());
    const channel = await connection.createChannel();
    await channel.assertExchange(TELEMETRY_EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(TELEMETRY_DLX, 'topic', { durable: true });
    this.connection = connection;
    this.channel = channel;
    this.reconnectDelayMs = BASE_RECONNECT_DELAY_MS;
    for (const registration of this.consumers) {
      await this.setupConsumer(registration);
    }
    this.logger.log(`connected; exchange '${TELEMETRY_EXCHANGE}' ready`);
  }

  private handleClose(): void {
    this.channel = undefined;
    this.connection = undefined;
    if (this.closing) {
      return;
    }
    this.logger.warn('connection closed; scheduling reconnect');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.closing || this.reconnecting) {
      return;
    }
    this.reconnecting = true;
    this.attemptReconnect();
  }

  private attemptReconnect(): void {
    setTimeout(() => {
      void this.reconnect();
    }, this.reconnectDelayMs);
  }

  private async reconnect(): Promise<void> {
    if (this.closing) {
      this.reconnecting = false;
      return;
    }
    try {
      await this.establish();
      this.reconnecting = false;
      this.logger.log('reconnected');
    } catch (error) {
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
      this.logger.error(`reconnect failed: ${(error as Error).message}; retrying in ${this.reconnectDelayMs}ms`);
      this.attemptReconnect();
    }
  }

  private async setupConsumer({ queue, routingKey, handler }: ConsumerRegistration): Promise<void> {
    if (!this.channel) {
      return;
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
    let handled = false;
    try {
      const payload: unknown = JSON.parse(message.content.toString());
      await handler(payload);
      handled = true;
    } catch (error) {
      this.logger.error(`handler failed on '${queue}', dead-lettering: ${(error as Error).message}`);
    }
    try {
      if (handled) {
        this.channel?.ack(message);
      } else {
        this.channel?.nack(message, false, false);
      }
    } catch (error) {
      this.logger.warn(`could not settle message on '${queue}': ${(error as Error).message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.closing = true;
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
