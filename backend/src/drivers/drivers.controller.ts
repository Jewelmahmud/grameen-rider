import { Controller, Get, Put, Body, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { DriversService } from './drivers.service';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  async getMyProfile(@Request() req: ExpressRequest) {
    return this.driversService.getDriverProfile(req.userProfile.id);
  }

  @Put('location')
  async updateLocation(
    @Request() req: ExpressRequest,
    @Body() body: { latitude: number; longitude: number },
  ) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new Error('Driver profile not found');
    }
    await this.driversService.updateLocation(
      driver.id,
      body.latitude,
      body.longitude,
    );
    return { success: true };
  }

  @Put('availability')
  async updateAvailability(
    @Request() req: ExpressRequest,
    @Body() body: { isOnline: boolean; isAvailable: boolean },
  ) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new Error('Driver profile not found');
    }
    await this.driversService.updateAvailability(
      driver.id,
      body.isOnline,
      body.isAvailable,
    );
    return { success: true };
  }
}

