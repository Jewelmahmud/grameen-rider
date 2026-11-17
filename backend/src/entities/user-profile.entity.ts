import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { StoredGilabRole } from '../common/auth/platform-roles';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true, name: 'auth_user_id' })
  @Index()
  authUserId: string;

  // Nullable: a profile first seen through a token may not have a phone yet (unique allows many NULLs).
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true, name: 'phone_number' })
  @Index()
  phoneNumber: string | null;

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

  // ─── GiLab identity mirror ────────────────────────────────────────────────

  /** Last resolved Grameen Ride roles, for reporting and filters. Authorization always re-resolves. */
  @Column({ type: 'text', array: true, default: '{customer}', name: 'platform_roles' })
  platformRoles: string[];

  /** GiLab role assignments ({name, isGlobal, companyId, isActive, expiresAt}). */
  @Column({ type: 'jsonb', nullable: true, name: 'gilab_roles' })
  gilabRoles: StoredGilabRole[] | null;

  @Column({ type: 'timestamp', nullable: true, name: 'gilab_roles_synced_at' })
  gilabRolesSyncedAt: Date | null;

  @Column({ type: 'boolean', default: false, name: 'is_employee' })
  @Index()
  isEmployee: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_staff' })
  isStaff: boolean;

  @Column({ type: 'varchar', length: 150, nullable: true })
  designation: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'employee_synced_at' })
  employeeSyncedAt: Date | null;

  // ─── Platform account state ───────────────────────────────────────────────

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: 'active' | 'blocked';

  @Column({ type: 'text', nullable: true, name: 'blocked_reason' })
  blockedReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

