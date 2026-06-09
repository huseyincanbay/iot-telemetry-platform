import { z } from 'zod';

export const TELEMETRY_TOPIC_PATTERN = 'devices/+/telemetry';

export function telemetryTopic(deviceId: string): string {
  return `devices/${deviceId}/telemetry`;
}

export function parseDeviceIdFromTopic(topic: string): string | null {
  const match = /^devices\/([^/]+)\/telemetry$/.exec(topic);
  return match ? match[1] : null;
}

export const TelemetrySchema = z.object({
  device_id: z.string().min(1).max(64),
  timestamp: z.string().datetime({ offset: true }),
  temp: z.number().min(-60).max(150),
  humidity: z.number().min(0).max(100),
  battery: z.number().min(0).max(100),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export type Telemetry = z.infer<typeof TelemetrySchema>;

export const TELEMETRY_METRICS = ['temp', 'humidity', 'battery'] as const;
export type TelemetryMetric = (typeof TELEMETRY_METRICS)[number];
