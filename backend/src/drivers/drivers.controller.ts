import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { DriversService } from './drivers.service';
import { RequirePermission } from '../common/auth/permission.guard';

/** Only GiLab users with the grameen_ride_driver role. */
@Controller('drivers')
@RequirePermission('trips.drive')
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
    if (body.isOnline && driver.isSuspended) {
      throw new ForbiddenException({ code: 'DRIVER_SUSPENDED', message: driver.suspendedReason || 'Your account is suspended' });
    }
    if (body.isOnline && driver.verificationStatus !== 'approved') {
      throw new ForbiddenException({ code: 'DRIVER_NOT_APPROVED', message: 'Your documents are still being checked' });
    }
    await this.driversService.updateAvailability(driver.id, Boolean(body.isOnline), Boolean(body.isOnline && body.isAvailable));
    return { success: true };
  }
}
