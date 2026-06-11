import { Module } from '@nestjs/common';
import { DeviceShadowService } from './device-shadow.service';
import { IngestionMetrics } from './ingestion.metrics';
import { IngestionService } from './ingestion.service';
import { MqttSubscriber } from './mqtt.subscriber';

@Module({
  providers: [IngestionService, MqttSubscriber, DeviceShadowService, IngestionMetrics],
  exports: [MqttSubscriber],
})
export class IngestionModule {}
