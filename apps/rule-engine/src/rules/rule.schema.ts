import { z } from 'zod';
import { AlertSeverity, TELEMETRY_METRICS } from '@telemetry/types';

const ThresholdRuleSchema = z.object({
  kind: z.literal('threshold'),
  id: z.string().min(1),
  metric: z.enum(TELEMETRY_METRICS),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'outside', 'inside']),
  threshold: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  sustainSeconds: z.number().int().min(0).default(0),
  severity: z.nativeEnum(AlertSeverity),
  message: z.string().min(1),
});

const ConnectivityRuleSchema = z.object({
  kind: z.literal('connectivity'),
  id: z.string().min(1),
  silenceSeconds: z.number().int().positive(),
  severity: z.nativeEnum(AlertSeverity),
  message: z.string().min(1),
});

export const RuleSchema = z
  .discriminatedUnion('kind', [ThresholdRuleSchema, ConnectivityRuleSchema])
  .superRefine((rule, ctx) => {
    if (rule.kind !== 'threshold') {
      return;
    }
    const isRange = rule.operator === 'outside' || rule.operator === 'inside';
    if (isRange && (rule.min === undefined || rule.max === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `rule '${rule.id}': operator '${rule.operator}' requires min and max` });
    }
    if (!isRange && rule.threshold === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `rule '${rule.id}': operator '${rule.operator}' requires threshold` });
    }
  });

export const RulesSchema = z.array(RuleSchema);
export type Rule = z.infer<typeof RuleSchema>;
export type ThresholdRule = Extract<Rule, { kind: 'threshold' }>;
export type ConnectivityRule = Extract<Rule, { kind: 'connectivity' }>;

export interface Evaluation {
  breaching: boolean;
  threshold: number;
}

export function evaluateRule(rule: ThresholdRule, value: number): Evaluation {
  if (rule.operator === 'outside' || rule.operator === 'inside') {
    const min = rule.min ?? Number.NEGATIVE_INFINITY;
    const max = rule.max ?? Number.POSITIVE_INFINITY;
    const breaching = rule.operator === 'outside' ? value < min || value > max : value >= min && value <= max;
    return { breaching, threshold: value < min ? min : max };
  }
  const threshold = rule.threshold ?? 0;
  switch (rule.operator) {
    case 'gt':
      return { breaching: value > threshold, threshold };
    case 'gte':
      return { breaching: value >= threshold, threshold };
    case 'lt':
      return { breaching: value < threshold, threshold };
    default:
      return { breaching: value <= threshold, threshold };
  }
}
