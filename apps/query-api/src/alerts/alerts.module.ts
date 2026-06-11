import { Module } from '@nestjs/common';
import { DatabaseModule } from '@telemetry/database';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
