import { Controller, Get, Post, Put, Body, Param, ParseUUIDPipe, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { TripsService } from './trips.service';
import { DriverActorService } from './driver-actor.service';
import { FareCalculationService } from './fare-calculation.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { RequirePermission } from '../common/auth/permission.guard';
import { CancelTripDto, CreateTripDto } from './dto/create-trip.dto';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly drivers: DriverActorService,
    private readonly dispatch: DispatchService,
    private readonly fareCalculationService: FareCalculationService,
  ) {}

  /**
   * @deprecated Use POST /pricing/quote. Kept for one app release; uses the old built-in rates,
   * not the admin-managed ones.
   */
  @Get('fare-estimate')
  estimateFare(
    @Body()
    body: {
      vehicleType: string;
      distanceKm: number;
      durationMinutes?: number;
      rentalType?: 'single' | 'hourly' | 'daily' | 'custom';
      rentalDurationHours?: number;
    },
  ) {
    return this.fareCalculationService.calculate(
      body.vehicleType,
      body.distanceKm,
      body.durationMinutes ?? 0,
      body.rentalType ?? 'single',
      body.rentalDurationHours,
    );
  }

  @Post()
  @RequirePermission('trips.book')
  createTrip(@Request() req: ExpressRequest, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(dto, req.userProfile);
  }

  /** The caller's trips as a passenger. Drivers use GET /drivers/me/trips. */
  @Get()
  getMyTrips(@Request() req: ExpressRequest) {
    return this.tripsService.findByPassengerId(req.userProfile.id);
  }

  @Get(':id')
  async getTrip(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.findForActor(id, await this.drivers.actor(req));
  }

  @Put(':id/offer/accept')
  @RequirePermission('trips.drive')
  async acceptOffer(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.dispatch.respond(id, await this.drivers.requireDriverId(req), true);
  }

  @Put(':id/offer/decline')
  @RequirePermission('trips.drive')
  async declineOffer(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.dispatch.respond(id, await this.drivers.requireDriverId(req), false);
    return { success: true };
  }

  /** @deprecated Same as PUT /trips/:id/offer/accept; only works for the driver the trip is offered to. */
  @Put(':id/accept')
  @RequirePermission('trips.drive')
  async acceptTrip(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.dispatch.respond(id, await this.drivers.requireDriverId(req), true);
  }

  @Put(':id/arrive')
  @RequirePermission('trips.drive')
  async arriveAtPickup(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.arriveAtPickup(id, await this.drivers.requireDriverId(req));
  }

  @Put(':id/start')
  @RequirePermission('trips.drive')
  async startTrip(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.startTrip(id, await this.drivers.requireDriverId(req));
  }

  @Put(':id/complete')
  @RequirePermission('trips.drive')
  async completeTrip(@Request() req: ExpressRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.completeTrip(id, await this.drivers.requireDriverId(req));
  }

  /** Passenger: cancels the trip. Assigned driver: gives it back to dispatch. */
  @Put(':id/cancel')
  async cancelTrip(
    @Request() req: ExpressRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelTripDto,
  ) {
    return this.tripsService.cancelTrip(id, await this.drivers.actor(req), body.cancellationReason);
  }
}
