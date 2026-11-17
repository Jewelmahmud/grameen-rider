import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../common/auth/permission.guard';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { AuditQueryDto, UpdateSettingsDto } from './dto/admin.dto';

@Controller('admin')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Every setting with its value, default and whether the caller may change it. */
  @Get('settings')
  @RequirePermission('settings.read')
  list(@Req() req: Request) {
    return this.settings.list(req.platformRoles);
  }

  /** Each key is checked against its own permission (service, matching, perks, system...). */
  @Put('settings')
  @RequirePermission('settings.read')
  async update(@Req() req: Request, @Body() dto: UpdateSettingsDto) {
    const { before, after } = await this.settings.update(dto.values, {
      authUserId: req.auth_user_id,
      roles: req.platformRoles,
    });
    await this.audit.record(req, { action: 'settings.update', entity: 'settings', entityId: Object.keys(after).join(','), before, after });
    return this.settings.list(req.platformRoles);
  }

  @Get('audit-logs')
  @RequirePermission('audit.read')
  auditLogs(@Query() q: AuditQueryDto) {
    return this.audit.list({
      entity: q.entity,
      entityId: q.entityId,
      actor: q.actor,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      page: q.page,
      pageSize: q.pageSize,
    });
  }
}
