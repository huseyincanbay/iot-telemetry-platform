import { Module } from '@nestjs/common';
import { DeviceShadowService } from './device-shadow.service';
import { IngestionService } from './ingestion.service';
import { MqttSubscriber } from './mqtt.subscriber';

@Module({
  providers: [IngestionService, MqttSubscriber, DeviceShadowService],
  exports: [MqttSubscriber],
})
export class IngestionModule {}
