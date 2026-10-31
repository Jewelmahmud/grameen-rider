import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { VerifyDriverDto } from './dto/verify-driver.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Reflector } from '@nestjs/core';

@Controller('admin')
@UseGuards(new RolesGuard(new Reflector()))
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Driver verification ──────────────────────────────────────────────────

  @Get('drivers/pending')
  getPendingDrivers() {
    return this.adminService.getPendingDrivers();
  }

  @Put('drivers/:id/verify')
  verifyDriver(@Param('id') id: string, @Body() dto: VerifyDriverDto) {
    return this.adminService.verifyDriver(id, dto);
  }

  // ─── Promotions ───────────────────────────────────────────────────────────

  @Get('promotions')
  getAllPromotions() {
    return this.adminService.getAllPromotions();
  }

  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.adminService.createPromotion(dto);
  }

  @Put('promotions/:id/toggle')
  togglePromotion(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.togglePromotion(id, body.isActive);
  }

  // ─── Support tickets ──────────────────────────────────────────────────────

  @Get('support/tickets')
  getAllTickets(@Query('status') status?: string) {
    return this.adminService.getAllTickets(status);
  }

  @Put('support/tickets/:id/status')
  updateTicketStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.adminService.updateTicketStatus(id, dto);
  }
}
