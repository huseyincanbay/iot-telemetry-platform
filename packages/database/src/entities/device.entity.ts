import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'devices' })
export class DeviceEntity {
  @PrimaryColumn({ name: 'device_id', type: 'text' })
  deviceId!: string;

  @Column({ name: 'first_seen', type: 'timestamptz', default: () => 'now()' })
  firstSeen!: Date;

  @Column({ name: 'last_seen', type: 'timestamptz' })
  lastSeen!: Date;

  @Column({ name: 'last_lat', type: 'double precision', nullable: true })
  lastLat!: number | null;

  @Column({ name: 'last_lon', type: 'double precision', nullable: true })
  lastLon!: number | null;
}
