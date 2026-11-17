import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Every admin/operations change: who did what to which record, with before and after. */
@Entity('admin_audit_logs')
@Index('ix_audit_entity', ['entity', 'entityId'])
@Index('ix_audit_actor_time', ['actorAuthUserId', 'createdAt'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'actor_auth_user_id' })
  actorAuthUserId: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'actor_name' })
  actorName: string | null;

  @Column({ type: 'varchar', length: 30, name: 'actor_role' })
  actorRole: string;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'varchar', length: 50 })
  entity: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'entity_id' })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  before: unknown;

  @Column({ type: 'jsonb', nullable: true })
  after: unknown;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
