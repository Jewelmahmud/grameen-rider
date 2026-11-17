import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from './fare-rate.entity';

/** A named circle on the map (centre + radius). Route fares are defined between two zones. */
@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, name: 'name_bn' })
  nameBn: string;

  @Column({ type: 'varchar', length: 150, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'center_latitude', transformer: decimalTransformer })
  centerLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'center_longitude', transformer: decimalTransformer })
  centerLongitude: number;

  @Column({ type: 'integer', name: 'radius_m' })
  radiusM: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  @Index()
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
