import { Controller, Get, Post, Put, Body, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { IsBoolean } from 'class-validator';
import { AdminService } from './admin.service';
import { VerifyDriverDto } from './dto/verify-driver.dto';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { RequirePermission } from '../common/auth/permission.guard';
import { AuditService } from '../audit/audit.service';

class TogglePromotionDto {
  @IsBoolean() isActive: boolean;
}

/**
 * Registered before AdminPeopleController so the literal `drivers/pending` route wins over
 * `drivers/:id`.
 */
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly audit: AuditService,
  ) {}

  /** @deprecated Use GET /admin/overview. */
  @Get('stats')
  @RequirePermission('reports.read')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Driver verification ──────────────────────────────────────────────────

  @Get('drivers/pending')
  @RequirePermission('drivers.read')
  getPendingDrivers() {
    return this.adminService.getPendingDrivers();
  }

  @Put('drivers/:id/verify')
  @RequirePermission('drivers.verify')
  async verifyDriver(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: VerifyDriverDto) {
    const after = await this.adminService.verifyDriver(id, dto);
    await this.audit.record(req, { action: 'driver.verify', entity: 'driver', entityId: id, after: { verificationStatus: after.verificationStatus, reason: dto.rejectionReason ?? null } });
    return after;
  }

  // ─── Promotions ───────────────────────────────────────────────────────────

  @Get('promotions')
  @RequirePermission('promotions.read')
  getAllPromotions() {
    return this.adminService.getAllPromotions();
  }

  @Post('promotions')
  @RequirePermission('promotions.write')
  async createPromotion(@Req() req: Request, @Body() dto: CreatePromotionDto) {
    const promo = await this.adminService.createPromotion(dto);
    await this.audit.record(req, { action: 'promotion.create', entity: 'promotion', entityId: promo.id, after: promo });
    return promo;
  }

  @Put('promotions/:id')
  @RequirePermission('promotions.write')
  async updatePromotion(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromotionDto) {
    const { before, after } = await this.adminService.updatePromotion(id, dto);
    await this.audit.record(req, { action: 'promotion.update', entity: 'promotion', entityId: id, before, after });
    return after;
  }

  @Put('promotions/:id/toggle')
  @RequirePermission('promotions.write')
  async togglePromotion(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: TogglePromotionDto) {
    const after = await this.adminService.togglePromotion(id, body.isActive);
    await this.audit.record(req, { action: 'promotion.toggle', entity: 'promotion', entityId: id, after: { isActive: body.isActive } });
    return after;
  }

  // ─── Support tickets ──────────────────────────────────────────────────────

  @Get('support/tickets')
  @RequirePermission('support.manage')
  getAllTickets(@Query('status') status?: string) {
    return this.adminService.getAllTickets(status);
  }

  @Put('support/tickets/:id/status')
  @RequirePermission('support.manage')
  async updateTicketStatus(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketStatusDto) {
    const after = await this.adminService.updateTicketStatus(id, dto);
    await this.audit.record(req, { action: 'ticket.status', entity: 'support_ticket', entityId: id, after: { status: dto.status } });
    return after;
  }
}
