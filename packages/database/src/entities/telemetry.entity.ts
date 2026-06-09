import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'telemetry' })
export class TelemetryEntity {
  @PrimaryColumn({ name: 'time', type: 'timestamptz' })
  time!: Date;

  @PrimaryColumn({ name: 'device_id', type: 'text' })
  deviceId!: string;

  @Column({ name: 'temp', type: 'double precision' })
  temp!: number;

  @Column({ name: 'humidity', type: 'double precision' })
  humidity!: number;

  @Column({ name: 'battery', type: 'double precision' })
  battery!: number;

  @Column({ name: 'lat', type: 'double precision' })
  lat!: number;

  @Column({ name: 'lon', type: 'double precision' })
  lon!: number;

  @Column({ name: 'ingested_at', type: 'timestamptz', default: () => 'now()' })
  ingestedAt!: Date;
}
