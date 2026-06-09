import { connect } from 'mqtt';
import { TelemetrySchema, telemetryTopic, type Telemetry } from '@telemetry/types';

const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://127.0.0.1:1883';
const DEVICE_COUNT = Number(process.env.DEVICE_COUNT ?? 10);
const PUBLISH_INTERVAL_MS = Number(process.env.PUBLISH_INTERVAL_MS ?? 1000);
const OFFLINE_AFTER_MS = Number(process.env.OFFLINE_AFTER_MS ?? 30_000);
const SPIKE_AFTER_MS = Number(process.env.SPIKE_AFTER_MS ?? 20_000);

type DeviceRole = 'normal' | 'offline' | 'spike';

interface Device {
  id: string;
  temp: number;
  humidity: number;
  battery: number;
  lat: number;
  lon: number;
  role: DeviceRole;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function createFleet(count: number): Device[] {
  const fleet: Device[] = [];
  for (let i = 1; i <= count; i += 1) {
    const role: DeviceRole = i === count ? 'spike' : i === count - 1 ? 'offline' : 'normal';
    fleet.push({
      id: `dev-${String(i).padStart(2, '0')}`,
      temp: 20 + Math.random() * 5,
      humidity: 45 + Math.random() * 10,
      battery: 100,
      lat: 41.0082 + (Math.random() - 0.5) * 0.2,
      lon: 28.9784 + (Math.random() - 0.5) * 0.2,
      role,
    });
  }
  return fleet;
}

function drift(device: Device, elapsedMs: number): void {
  const spiking = device.role === 'spike' && elapsedMs >= SPIKE_AFTER_MS;
  const targetTemp = spiking ? 95 : 22;
  device.temp = clamp(device.temp + (targetTemp - device.temp) * 0.1 + (Math.random() - 0.5), -60, 150);
  device.humidity = clamp(device.humidity + (Math.random() - 0.5) * 2, 30, 70);
  device.battery = clamp(device.battery - 0.05, 0, 100);
  device.lat = clamp(device.lat + (Math.random() - 0.5) * 0.001, -90, 90);
  device.lon = clamp(device.lon + (Math.random() - 0.5) * 0.001, -180, 180);
}

const fleet = createFleet(DEVICE_COUNT);
const startedAt = Date.now();
const client = connect(MQTT_URL);

let timer: NodeJS.Timeout | undefined;
let ticks = 0;
let published = 0;

function tick(): void {
  ticks += 1;
  const elapsed = Date.now() - startedAt;
  for (const device of fleet) {
    if (device.role === 'offline' && elapsed >= OFFLINE_AFTER_MS) {
      continue;
    }
    drift(device, elapsed);
    const payload: Telemetry = {
      device_id: device.id,
      timestamp: new Date().toISOString(),
      temp: round(device.temp),
      humidity: round(device.humidity),
      battery: round(device.battery),
      lat: round(device.lat),
      lon: round(device.lon),
    };
    const parsed = TelemetrySchema.safeParse(payload);
    if (!parsed.success) {
      console.error(`[simulator] invalid payload for ${device.id}, skipped`);
      continue;
    }
    client.publish(telemetryTopic(device.id), JSON.stringify(parsed.data), { qos: 1 });
    published += 1;
  }
  if (ticks % 5 === 0) {
    console.log(`[simulator] tick ${ticks}, published ${published} total`);
  }
}

client.on('connect', () => {
  console.log(`[simulator] connected to ${MQTT_URL}`);
  console.log(`[simulator] ${fleet.length} devices @ ${PUBLISH_INTERVAL_MS}ms (offline: dev-${String(DEVICE_COUNT - 1).padStart(2, '0')} after ${OFFLINE_AFTER_MS}ms, spike: dev-${String(DEVICE_COUNT).padStart(2, '0')} after ${SPIKE_AFTER_MS}ms)`);
  timer = setInterval(tick, PUBLISH_INTERVAL_MS);
});

client.on('error', (error) => {
  console.error(`[simulator] mqtt error: ${error.message}`);
});

function shutdown(): void {
  if (timer) {
    clearInterval(timer);
  }
  void client.endAsync().then(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
