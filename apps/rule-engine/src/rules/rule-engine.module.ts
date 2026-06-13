import { Module } from '@nestjs/common';
import { DatabaseModule } from '@telemetry/database';
import { RuleEngineMetrics } from './rule-engine.metrics';
import { RuleEngineService } from './rule-engine.service';

@Module({
  imports: [DatabaseModule.forFeature()],
  providers: [RuleEngineService, RuleEngineMetrics],
})
export class RuleEngineModule {}
