import { Module } from '@nestjs/common';
import { DatabaseModule } from '@telemetry/database';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
