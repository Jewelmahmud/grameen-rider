import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../common/auth/permission.guard';
import { AuditService } from '../audit/audit.service';
import { AdminTripsService } from './admin-trips.service';
import { AssignDriverDto, ListTripsQueryDto, ReasonDto, UpcomingQueryDto } from './dto/admin.dto';

@Controller('admin')
export class AdminTripsController {
  constructor(
    private readonly trips: AdminTripsService,
    private readonly audit: AuditService,
  ) {}

  @Get('trips')
  @RequirePermission('trips.read_all')
  list(@Query() q: ListTripsQueryDto) {
    return this.trips.list(q);
  }

  @Get('trips/:id')
  @RequirePermission('trips.read_all')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.trips.detail(id);
  }

  @Put('trips/:id/cancel')
  @RequirePermission('trips.intervene')
  async cancel(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto) {
    const { before, after } = await this.trips.cancel(id, dto.reason);
    await this.audit.record(req, { action: 'trip.cancel', entity: 'trip', entityId: id, before, after: { status: after.status, reason: dto.reason } });
    return after;
  }

  @Put('trips/:id/assign')
  @RequirePermission('trips.intervene')
  async assign(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignDriverDto) {
    const { before, after } = await this.trips.assign(id, dto.driverId, dto.vehicleId, req.auth_user_id);
    await this.audit.record(req, {
      action: 'trip.assign',
      entity: 'trip',
      entityId: id,
      before,
      after: { status: after.status, driverId: after.driverId, vehicleId: after.vehicleId },
    });
    return after;
  }

  @Put('trips/:id/redispatch')
  @RequirePermission('trips.intervene')
  async redispatch(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { before, after } = await this.trips.redispatch(id);
    await this.audit.record(req, { action: 'trip.redispatch', entity: 'trip', entityId: id, before, after });
    return after;
  }

  @Get('rentals/upcoming')
  @RequirePermission('trips.read_all')
  upcoming(@Query() q: UpcomingQueryDto) {
    return this.trips.upcomingRentals(q.hours ?? 24);
  }
}
