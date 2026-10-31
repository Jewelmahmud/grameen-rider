import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { TripsService } from './trips.service';
import { DriversService } from '../drivers/drivers.service';
import { FareCalculationService } from './fare-calculation.service';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly driversService: DriversService,
    private readonly fareCalculationService: FareCalculationService,
  ) {}

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
  async createTrip(@Request() req: ExpressRequest, @Body() createTripDto: any) {
    return this.tripsService.createTrip(createTripDto, req.userProfile.id);
  }

  @Get()
  async getMyTrips(@Request() req: ExpressRequest) {
    return this.tripsService.findByPassengerId(req.userProfile.id);
  }

  @Get(':id')
  async getTrip(@Param('id') id: string) {
    return this.tripsService.findById(id);
  }

  @Put(':id/accept')
  async acceptTrip(@Param('id') id: string, @Request() req: ExpressRequest) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new Error('Driver profile not found');
    }
    return this.tripsService.acceptTrip(id, driver.id);
  }

  @Put(':id/arrive')
  async arriveAtPickup(@Param('id') id: string, @Request() req: ExpressRequest) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new Error('Driver profile not found');
    }
    return this.tripsService.arriveAtPickup(id, driver.id);
  }

  @Put(':id/start')
  async startTrip(@Param('id') id: string, @Request() req: ExpressRequest) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new Error('Driver profile not found');
    }
    return this.tripsService.startTrip(id, driver.id);
  }

  @Put(':id/complete')
  async completeTrip(@Param('id') id: string, @Request() req: ExpressRequest) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new Error('Driver profile not found');
    }
    return this.tripsService.completeTrip(id, driver.id);
  }

  @Put(':id/cancel')
  async cancelTrip(
    @Param('id') id: string,
    @Body() body: { cancellationReason?: string; cancelledBy?: 'passenger' | 'driver' | 'system' },
  ) {
    return this.tripsService.cancelTrip(id, {
      cancellationReason: body.cancellationReason,
      cancelledBy: body.cancelledBy ?? 'passenger',
    });
  }
}
