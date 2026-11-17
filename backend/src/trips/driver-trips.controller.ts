import { Controller, Get, Query, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { RequirePermission } from '../common/auth/permission.guard';
import { DispatchService } from '../dispatch/dispatch.service';
import { TripsService } from './trips.service';
import { DriverActorService } from './driver-actor.service';

@Controller('drivers/me')
@RequirePermission('trips.drive')
export class DriverTripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly dispatch: DispatchService,
    private readonly drivers: DriverActorService,
  ) {}

  /** The offer waiting for this driver, if any (for when the socket push was missed). */
  @Get('offers/current')
  async currentOffer(@Request() req: ExpressRequest) {
    return { offer: await this.dispatch.currentOfferFor(await this.drivers.requireDriverId(req)) };
  }

  /** status=active (in progress), upcoming (accepted future rentals/scheduled rides), history; omit for all. */
  @Get('trips')
  async myTrips(@Request() req: ExpressRequest, @Query('status') status?: 'active' | 'upcoming' | 'history') {
    return this.trips.findByDriverId(await this.drivers.requireDriverId(req), status);
  }
}
