import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { IngestionModule } from '../ingestion/ingestion.module';
import { HealthController } from './health.controller';
import { MqttHealthIndicator } from './mqtt.health';

@Module({
  imports: [TerminusModule, IngestionModule],
  controllers: [HealthController],
  providers: [MqttHealthIndicator],
})
export class HealthModule {}
