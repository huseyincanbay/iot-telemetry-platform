import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { z } from 'zod';
import { TELEMETRY_METRICS } from '@telemetry/types';
import { MAX_SERIES_POINTS } from '../app.constants';

export const SeriesQuerySchema = z.object({
  metric: z.enum(TELEMETRY_METRICS),
  resolution: z.enum(['raw', '1m', '1h']).default('1m'),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type SeriesQuery = z.infer<typeof SeriesQuerySchema>;

interface RawPoint {
  time: string;
  value: number;
}

interface AggregatePoint {
  time: string;
  avg: number;
  min: number;
  max: number;
}

export interface SeriesResponse {
  device_id: string;
  metric: SeriesQuery['metric'];
  resolution: SeriesQuery['resolution'];
  from: string;
  to: string;
  points: RawPoint[] | AggregatePoint[];
}

@Injectable()
export class SeriesService {
  constructor(private readonly dataSource: DataSource) {}

  async query(deviceId: string, params: SeriesQuery): Promise<SeriesResponse> {
    const to = params.to ? new Date(params.to) : new Date();
    const from = params.from ? new Date(params.from) : new Date(to.getTime() - 3_600_000);
    const points =
      params.resolution === 'raw'
        ? await this.rawPoints(deviceId, params.metric, from, to)
        : await this.aggregatePoints(deviceId, params.metric, params.resolution, from, to);

    return {
      device_id: deviceId,
      metric: params.metric,
      resolution: params.resolution,
      from: from.toISOString(),
      to: to.toISOString(),
      points,
    };
  }

  private async rawPoints(deviceId: string, metric: string, from: Date, to: Date): Promise<RawPoint[]> {
    const rows = await this.dataSource.query<Array<{ time: Date; value: number }>>(
      `SELECT time, ${metric} AS value FROM telemetry
       WHERE device_id = $1 AND time >= $2 AND time <= $3
       ORDER BY time ASC
       LIMIT $4`,
      [deviceId, from, to, MAX_SERIES_POINTS],
    );
    return rows.map((row) => ({ time: new Date(row.time).toISOString(), value: Number(row.value) }));
  }

  private async aggregatePoints(
    deviceId: string,
    metric: string,
    resolution: '1m' | '1h',
    from: Date,
    to: Date,
  ): Promise<AggregatePoint[]> {
    const view = resolution === '1m' ? 'telemetry_1m' : 'telemetry_1h';
    const rows = await this.dataSource.query<Array<{ time: Date; avg: number; min: number; max: number }>>(
      `SELECT bucket AS time, avg_${metric} AS avg, min_${metric} AS min, max_${metric} AS max FROM ${view}
       WHERE device_id = $1 AND bucket >= $2 AND bucket <= $3
       ORDER BY bucket ASC
       LIMIT $4`,
      [deviceId, from, to, MAX_SERIES_POINTS],
    );
    return rows.map((row) => ({
      time: new Date(row.time).toISOString(),
      avg: Number(row.avg),
      min: Number(row.min),
      max: Number(row.max),
    }));
  }
}
