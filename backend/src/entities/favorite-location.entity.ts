import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('favorite_locations')
export class FavoriteLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_profile_id' })
  @Index()
  userProfileId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_profile_id' })
  userProfile: UserProfile;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  @Index()
  longitude: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'other',
    name: 'location_type',
  })
  @Index()
  locationType: 'home' | 'work' | 'other';

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

