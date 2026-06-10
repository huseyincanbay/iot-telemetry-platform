import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@telemetry/common';
import { DeviceEntity } from '@telemetry/database';
import { deviceShadowKey, DeviceStatus, type Telemetry } from '@telemetry/types';
import { OFFLINE_THRESHOLD_MS } from '../app.constants';

export interface DeviceSummary {
  device_id: string;
  first_seen: string;
  last_seen: string;
  status: DeviceStatus;
  last: Telemetry | null;
}

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<DeviceSummary[]> {
    const rows = await this.devices.find({ order: { deviceId: 'ASC' } });
    if (rows.length === 0) {
      return [];
    }
    const shadows = await this.redis.client.mget(rows.map((row) => deviceShadowKey(row.deviceId)));
    return rows.map((row, index) => this.toSummary(row, shadows[index]));
  }

  async findOne(deviceId: string): Promise<DeviceSummary> {
    const row = await this.devices.findOneBy({ deviceId });
    if (!row) {
      throw new NotFoundException(`device ${deviceId} not found`);
    }
    const shadow = await this.redis.client.get(deviceShadowKey(deviceId));
    return this.toSummary(row, shadow);
  }

  private toSummary(row: DeviceEntity, shadow: string | null): DeviceSummary {
    const ageMs = Date.now() - row.lastSeen.getTime();
    return {
      device_id: row.deviceId,
      first_seen: row.firstSeen.toISOString(),
      last_seen: row.lastSeen.toISOString(),
      status: ageMs <= OFFLINE_THRESHOLD_MS ? DeviceStatus.Online : DeviceStatus.Offline,
      last: shadow ? (JSON.parse(shadow) as Telemetry) : null,
    };
  }
}
