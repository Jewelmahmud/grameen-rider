import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true, name: 'setting_key' })
  @Index()
  settingKey: string;

  @Column({ type: 'text', name: 'setting_value' })
  settingValue: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'string',
    name: 'setting_type',
  })
  settingType: 'string' | 'number' | 'boolean' | 'json';

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'updated_by_auth_user_id' })
  updatedByAuthUserId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

