import { Module } from '@nestjs/common';
import { DatabaseModule } from '@telemetry/database';
import { NotificationService } from './notification.service';

@Module({
  imports: [DatabaseModule.forFeature()],
  providers: [NotificationService],
})
export class NotificationModule {}
