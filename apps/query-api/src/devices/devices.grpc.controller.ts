import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { DeviceStatus, type Telemetry } from '@telemetry/types';
import { DevicesService, DeviceSummary } from './devices.service';
import { SeriesQuerySchema, SeriesService } from './series.service';

interface GrpcDevice {
  device_id: string;
  first_seen: string;
  last_seen: string;
  status: DeviceStatus;
  last?: Telemetry;
}

interface GrpcSeriesPoint {
  time: string;
  avg: number;
  min: number;
  max: number;
}

interface GrpcSeries {
  device_id: string;
  metric: string;
  resolution: string;
  from: string;
  to: string;
  points: GrpcSeriesPoint[];
}

interface DeviceRequest {
  device_id: string;
}

interface SeriesRequest {
  device_id: string;
  metric: string;
  resolution?: string;
  from?: string;
  to?: string;
}

@Controller()
export class DevicesGrpcController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly seriesService: SeriesService,
  ) {}

  @GrpcMethod('DeviceService', 'ListDevices')
  async listDevices(): Promise<{ devices: GrpcDevice[] }> {
    const devices = await this.devicesService.findAll();
    return { devices: devices.map((device) => this.toGrpcDevice(device)) };
  }

  @GrpcMethod('DeviceService', 'GetDevice')
  async getDevice(request: DeviceRequest): Promise<GrpcDevice> {
    return this.toGrpcDevice(await this.devicesService.findOne(request.device_id));
  }

  @GrpcMethod('DeviceService', 'GetSeries')
  async getSeries(request: SeriesRequest): Promise<GrpcSeries> {
    const params = SeriesQuerySchema.parse({
      metric: request.metric,
      resolution: request.resolution || undefined,
      from: request.from || undefined,
      to: request.to || undefined,
    });
    const result = await this.seriesService.query(request.device_id, params);
    return {
      device_id: result.device_id,
      metric: result.metric,
      resolution: result.resolution,
      from: result.from,
      to: result.to,
      points: result.points.map((point) =>
        'value' in point
          ? { time: point.time, avg: point.value, min: point.value, max: point.value }
          : { time: point.time, avg: point.avg, min: point.min, max: point.max },
      ),
    };
  }

  private toGrpcDevice(device: DeviceSummary): GrpcDevice {
    return {
      device_id: device.device_id,
      first_seen: device.first_seen,
      last_seen: device.last_seen,
      status: device.status,
      last: device.last ?? undefined,
    };
  }
}
