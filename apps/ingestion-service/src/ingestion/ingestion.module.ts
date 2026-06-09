import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { MqttSubscriber } from './mqtt.subscriber';

@Module({
  providers: [IngestionService, MqttSubscriber],
  exports: [MqttSubscriber],
})
export class IngestionModule {}
