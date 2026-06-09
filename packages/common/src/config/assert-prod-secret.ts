const DEFAULT_MIN_LENGTH = 16;

const KNOWN_WEAK_VALUES = new Set<string>([
  'changeme',
  'change-me',
  'admin',
  'password',
  'secret',
  'telemetry',
  'telemetry-dev',
  'telemetry-dev-secret',
  'your-secret-here',
]);

export interface AssertProdSecretOptions {
  name: string;
  value: string | undefined;
  minLength?: number;
}

export function assertProdSecret({
  name,
  value,
  minLength = DEFAULT_MIN_LENGTH,
}: AssertProdSecretOptions): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (!value || value.trim().length === 0) {
    throw new Error(`[config] ${name} must be set in production (NODE_ENV=production).`);
  }

  if (value.length < minLength) {
    throw new Error(
      `[config] ${name} must be at least ${minLength} characters in production (current length: ${value.length}).`,
    );
  }

  if (KNOWN_WEAK_VALUES.has(value.toLowerCase())) {
    throw new Error(
      `[config] ${name} is set to a known insecure default. Rotate it before deploying to production.`,
    );
  }
}

export function assertProdSecrets(secrets: AssertProdSecretOptions[]): void {
  for (const secret of secrets) {
    assertProdSecret(secret);
  }
}

export function assertMetricsToken(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const token = process.env.METRICS_TOKEN;
  if (!token || token.length < DEFAULT_MIN_LENGTH) {
    throw new Error(
      '[config] METRICS_TOKEN must be set (min 16 chars) in production to protect /metrics.',
    );
  }
}
