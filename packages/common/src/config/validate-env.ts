import type { ZodType } from 'zod';

export function validateEnv<T>(schema: ZodType<T>): (config: Record<string, unknown>) => T {
  return (config: Record<string, unknown>): T => {
    const result = schema.safeParse(config);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw new Error(`[config] invalid environment: ${issues}`);
    }
    return result.data;
  };
}
