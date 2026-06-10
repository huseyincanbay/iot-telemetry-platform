import { z } from 'zod';
import { DEFAULT_PORT } from '../app.constants';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  METRICS_TOKEN: z.string().min(16).optional(),
  DATABASE_URL: z.string().url(),
  MQTT_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  INGEST_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  INGEST_BATCH_INTERVAL_MS: z.coerce.number().int().positive().default(500),
});

export type Env = z.infer<typeof envSchema>;
