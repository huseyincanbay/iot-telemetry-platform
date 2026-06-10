import { Controller, Get, Param } from '@nestjs/common';
import { DevicesService, DeviceSummary } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  findAll(): Promise<DeviceSummary[]> {
    return this.devices.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<DeviceSummary> {
    return this.devices.findOne(id);
  }
}
