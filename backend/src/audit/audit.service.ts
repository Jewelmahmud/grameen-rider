import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Request } from 'express';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import { normaliseIp } from '../auth/gilab.client';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

export interface AuditQuery {
  entity?: string;
  entityId?: string;
  actor?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * Records admin/operations changes. Callers record explicitly (with before/after) right after a
 * successful write. A failed audit write is logged, never thrown: the change has already happened.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AdminAuditLog) private readonly repo: Repository<AdminAuditLog>) {}

  async record(req: Request, entry: AuditEntry): Promise<void> {
    const profile = req.userProfile;
    const role = (req.platformRoles ?? []).find((r) => r !== 'customer') ?? 'customer';
    try {
      await this.repo.insert({
        actorAuthUserId: req.auth_user_id,
        actorName: profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null : null,
        actorRole: role,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        before: entry.before ?? null,
        after: entry.after ?? null,
        ip: normaliseIp(req.ip) ?? null,
      });
    } catch (error) {
      this.logger.error(`Audit write failed for ${entry.action}`, error instanceof Error ? error.stack : error);
    }
  }

  async list(query: AuditQuery) {
    const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
    const page = Math.max(query.page ?? 1, 1);
    const where: FindOptionsWhere<AdminAuditLog> = {};
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.actor) where.actorAuthUserId = query.actor;
    if (query.from || query.to) {
      where.createdAt = Between(query.from ?? new Date(0), query.to ?? new Date());
    }
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }
}
