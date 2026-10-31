import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { DriversService } from './drivers.service';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  async createDriverProfile(
    @Request() req: ExpressRequest,
    @Body()
    body: {
      licenseNumber: string;
      licenseExpiryDate?: string;
      vehicleRegistrationNumber: string;
    },
  ) {
    return this.driversService.createDriverProfile(req.userProfile.id, {
      licenseNumber: body.licenseNumber,
      licenseExpiryDate: body.licenseExpiryDate,
      vehicleRegistrationNumber: body.vehicleRegistrationNumber,
    });
  }

  @Get('me')
  async getMyProfile(@Request() req: ExpressRequest) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }
    return driver;
  }

  @Get('me/earnings')
  async getMyEarnings(@Request() req: ExpressRequest) {
    return this.driversService.getEarningsSummary(req.userProfile.id);
  }

  @Put('location')
  async updateLocation(
    @Request() req: ExpressRequest,
    @Body() body: { latitude: number; longitude: number },
  ) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }
    await this.driversService.updateLocation(driver.id, body.latitude, body.longitude);
    return { success: true };
  }

  @Put('availability')
  async updateAvailability(
    @Request() req: ExpressRequest,
    @Body() body: { isOnline: boolean; isAvailable: boolean },
  ) {
    const driver = await this.driversService.getDriverProfile(req.userProfile.id);
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }
    await this.driversService.updateAvailability(driver.id, body.isOnline, body.isAvailable);
    return { success: true };
  }
}
