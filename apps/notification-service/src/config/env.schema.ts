import { z } from 'zod';
import { DEFAULT_PORT } from '../app.constants';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  METRICS_TOKEN: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;
