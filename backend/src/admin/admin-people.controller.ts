import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../common/auth/permission.guard';
import { AuditService } from '../audit/audit.service';
import { AdminPeopleService } from './admin-people.service';
import { ListDriversQueryDto, ListUsersQueryDto, ReasonDto, UpdateVehicleDto } from './dto/admin.dto';

@Controller('admin')
export class AdminPeopleController {
  constructor(
    private readonly people: AdminPeopleService,
    private readonly audit: AuditService,
  ) {}

  @Get('users')
  @RequirePermission('users.read')
  listUsers(@Query() q: ListUsersQueryDto) {
    return this.people.listUsers(q);
  }

  @Get('users/:id')
  @RequirePermission('users.read')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.people.getUser(id);
  }

  @Put('users/:id/block')
  @RequirePermission('users.block')
  async block(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto) {
    const { before, after } = await this.people.setBlocked(id, true, dto.reason, req.userProfile.id);
    await this.audit.record(req, { action: 'user.block', entity: 'user', entityId: id, before, after });
    return after;
  }

  @Put('users/:id/unblock')
  @RequirePermission('users.block')
  async unblock(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { before, after } = await this.people.setBlocked(id, false, null, req.userProfile.id);
    await this.audit.record(req, { action: 'user.unblock', entity: 'user', entityId: id, before, after });
    return after;
  }

  @Get('drivers')
  @RequirePermission('drivers.read')
  listDrivers(@Query() q: ListDriversQueryDto) {
    return this.people.listDrivers(q);
  }

  @Get('drivers/:id')
  @RequirePermission('drivers.read')
  getDriver(@Param('id', ParseUUIDPipe) id: string) {
    return this.people.getDriver(id);
  }

  @Put('drivers/:id/suspend')
  @RequirePermission('drivers.suspend')
  async suspend(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto) {
    const { before, after } = await this.people.setSuspended(id, true, dto.reason);
    await this.audit.record(req, { action: 'driver.suspend', entity: 'driver', entityId: id, before, after });
    return after;
  }

  @Put('drivers/:id/unsuspend')
  @RequirePermission('drivers.suspend')
  async unsuspend(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { before, after } = await this.people.setSuspended(id, false, null);
    await this.audit.record(req, { action: 'driver.unsuspend', entity: 'driver', entityId: id, before, after });
    return after;
  }

  @Put('vehicles/:id')
  @RequirePermission('vehicles.verify')
  async updateVehicle(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) {
    const { before, after } = await this.people.updateVehicle(id, dto);
    await this.audit.record(req, { action: 'vehicle.update', entity: 'vehicle', entityId: id, before, after });
    return after;
  }
}
