import { Module } from '@nestjs/common';
import { RuleEngineService } from './rule-engine.service';

@Module({
  providers: [RuleEngineService],
})
export class RuleEngineModule {}
