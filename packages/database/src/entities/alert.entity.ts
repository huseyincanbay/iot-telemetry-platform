import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'alerts' })
export class AlertEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'rule_id', type: 'text' })
  ruleId!: string;

  @Column({ name: 'device_id', type: 'text' })
  deviceId!: string;

  @Column({ name: 'severity', type: 'text' })
  severity!: string;

  @Column({ name: 'metric', type: 'text' })
  metric!: string;

  @Column({ name: 'value', type: 'double precision' })
  value!: number;

  @Column({ name: 'threshold', type: 'double precision' })
  threshold!: number;

  @Column({ name: 'message', type: 'text' })
  message!: string;

  @Column({ name: 'triggered_at', type: 'timestamptz' })
  triggeredAt!: Date;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
