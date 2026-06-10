import { Controller, Get, Param, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@telemetry/common';
import { DevicesService, DeviceSummary } from './devices.service';
import { SeriesQuery, SeriesQuerySchema, SeriesResponse, SeriesService } from './series.service';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devices: DevicesService,
    private readonly seriesService: SeriesService,
  ) {}

  @Get()
  findAll(): Promise<DeviceSummary[]> {
    return this.devices.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<DeviceSummary> {
    return this.devices.findOne(id);
  }

  @Get(':id/series')
  series(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(SeriesQuerySchema)) query: SeriesQuery,
  ): Promise<SeriesResponse> {
    return this.seriesService.query(id, query);
  }
}
