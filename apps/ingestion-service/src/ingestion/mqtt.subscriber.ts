import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, MqttClient } from 'mqtt';
import { parseDeviceIdFromTopic, TelemetrySchema, TELEMETRY_TOPIC_PATTERN } from '@telemetry/types';
import { IngestionService } from './ingestion.service';

@Injectable()
export class MqttSubscriber implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(MqttSubscriber.name);
  private client?: MqttClient;

  constructor(
    private readonly config: ConfigService,
    private readonly ingestion: IngestionService,
  ) {}

  onModuleInit(): void {
    const url = this.config.getOrThrow<string>('MQTT_URL');
    this.client = connect(url, { reconnectPeriod: 2000 });

    this.client.on('connect', () => {
      this.client?.subscribe(TELEMETRY_TOPIC_PATTERN, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`subscribe failed: ${error.message}`);
          return;
        }
        this.logger.log(`subscribed to ${TELEMETRY_TOPIC_PATTERN}`);
      });
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    this.client.on('error', (error) => {
      this.logger.error(`mqtt error: ${error.message}`);
    });
  }

  private handleMessage(topic: string, payload: Buffer): void {
    const deviceId = parseDeviceIdFromTopic(topic);
    if (!deviceId) {
      return;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(payload.toString());
    } catch {
      this.logger.warn(`dropped non-JSON payload on ${topic}`);
      return;
    }

    const parsed = TelemetrySchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn(`dropped invalid telemetry on ${topic}`);
      return;
    }

    if (parsed.data.device_id !== deviceId) {
      this.logger.warn(`dropped telemetry with topic/device mismatch on ${topic}`);
      return;
    }

    this.ingestion.enqueue(parsed.data);
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client?.endAsync();
  }
}
