import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true, name: 'auth_user_id' })
  @Index()
  authUserId: string;

  @Column({ type: 'varchar', length: 20, unique: true, name: 'phone_number' })
  @Index()
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_name' })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'profile_image_url' })
  profileImageUrl: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'passenger',
    name: 'user_type',
  })
  @Index()
  userType: 'passenger' | 'driver';

  @Column({ type: 'text', nullable: true, name: 'fcm_token' })
  @Index()
  fcmToken: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'bn',
    name: 'language_preference',
  })
  languagePreference: 'bn' | 'en';

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  @Index()
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_active_at' })
  lastActiveAt: Date;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false, name: 'phone_verified' })
  phoneVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

