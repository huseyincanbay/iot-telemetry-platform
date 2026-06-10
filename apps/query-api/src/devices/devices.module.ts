import { Module } from '@nestjs/common';
import { DatabaseModule } from '@telemetry/database';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { SeriesService } from './series.service';

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [DevicesController],
  providers: [DevicesService, SeriesService],
})
export class DevicesModule {}
