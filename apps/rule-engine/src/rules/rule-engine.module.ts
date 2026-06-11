import { Module } from '@nestjs/common';
import { RuleEngineMetrics } from './rule-engine.metrics';
import { RuleEngineService } from './rule-engine.service';

@Module({
  providers: [RuleEngineService, RuleEngineMetrics],
})
export class RuleEngineModule {}
