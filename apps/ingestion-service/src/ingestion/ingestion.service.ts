import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { DeviceEntity, TelemetryEntity } from '@telemetry/database';
import type { Telemetry } from '@telemetry/types';
import { DeviceShadowService } from './device-shadow.service';

@Injectable()
export class IngestionService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(IngestionService.name);
  private readonly batchSize: number;
  private readonly intervalMs: number;
  private buffer: Telemetry[] = [];
  private timer?: NodeJS.Timeout;
  private flushChain: Promise<void> = Promise.resolve();

  constructor(
    config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly deviceShadow: DeviceShadowService,
  ) {
    this.batchSize = config.get<number>('INGEST_BATCH_SIZE') ?? 100;
    this.intervalMs = config.get<number>('INGEST_BATCH_INTERVAL_MS') ?? 500;
  }

  onModuleInit(): void {
    this.timer = setInterval(() => this.scheduleFlush(), this.intervalMs);
  }

  enqueue(telemetry: Telemetry): void {
    this.buffer.push(telemetry);
    if (this.buffer.length >= this.batchSize) {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    this.flushChain = this.flushChain.then(() => this.flush());
  }

  private async flush(): Promise<void> {
    const batch = this.buffer.splice(0);
    if (batch.length === 0) {
      return;
    }
    try {
      await this.persist(batch);
    } catch (error) {
      this.logger.error(`failed to persist ${batch.length} readings: ${(error as Error).message}`);
    }
  }

  private async persist(batch: Telemetry[]): Promise<void> {
    const readings = batch.map((item) => ({
      time: new Date(item.timestamp),
      deviceId: item.device_id,
      temp: item.temp,
      humidity: item.humidity,
      battery: item.battery,
      lat: item.lat,
      lon: item.lon,
    }));

    const latestByDevice = new Map<string, Telemetry>();
    for (const item of batch) {
      const existing = latestByDevice.get(item.device_id);
      if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
        latestByDevice.set(item.device_id, item);
      }
    }
    const latest = [...latestByDevice.values()];

    await this.dataSource.transaction(async (manager) => {
      await manager.insert(TelemetryEntity, readings);
      await manager
        .createQueryBuilder()
        .insert()
        .into(DeviceEntity)
        .values(
          latest.map((item) => ({
            deviceId: item.device_id,
            lastSeen: new Date(item.timestamp),
            lastLat: item.lat,
            lastLon: item.lon,
          })),
        )
        .orUpdate(['last_seen', 'last_lat', 'last_lon'], ['device_id'])
        .execute();
    });

    void this.deviceShadow.update(latest);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.scheduleFlush();
    await this.flushChain;
  }
}
