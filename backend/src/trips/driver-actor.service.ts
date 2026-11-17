import { ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { DriversService } from '../drivers/drivers.service';
import { isStaff } from '../common/auth/platform-roles';
import { TripActor } from './trips.service';

/** Resolves the caller's driver record (cached on the request) and builds a TripActor. */
@Injectable()
export class DriverActorService {
  constructor(private readonly driversService: DriversService) {}

  async driverId(req: Request): Promise<string | null> {
    const cached = (req as any)._driverId;
    if (cached !== undefined) return cached;
    const driver = req.platformRoles?.includes('driver')
      ? await this.driversService.getDriverProfile(req.userProfile.id)
      : null;
    (req as any)._driverId = driver?.id ?? null;
    return (req as any)._driverId;
  }

  async requireDriverId(req: Request): Promise<string> {
    const id = await this.driverId(req);
    if (!id) {
      throw new ForbiddenException({ code: 'NOT_A_DRIVER', message: 'Driver profile not found. Register as a driver first.' });
    }
    return id;
  }

  async actor(req: Request): Promise<TripActor> {
    return {
      userProfileId: req.userProfile.id,
      driverId: await this.driverId(req),
      isStaff: isStaff(req.platformRoles),
    };
  }
}
