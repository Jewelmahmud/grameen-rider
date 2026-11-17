import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

/** No auth (see AuthModule PUBLIC_ROUTES). Apps read this at startup. */
@Controller('config')
export class PublicConfigController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  async getPublicConfig() {
    const s = await this.settings.publicConfig();
    return {
      services: {
        ride: {
          vehicleTypes: s['service.ride.vehicleTypes'],
          scheduledMinLeadMinutes: s['service.ride.scheduledMinLeadMinutes'],
          scheduledMaxDaysAhead: s['service.ride.scheduledMaxDaysAhead'],
        },
        rental: {
          vehicleTypes: s['service.rental.vehicleTypes'],
          minLeadMinutes: s['service.rental.minLeadMinutes'],
          maxDaysAhead: s['service.rental.maxDaysAhead'],
        },
      },
      paymentMethods: s['payments.methods'],
      support: { phone: s['support.phone'], whatsapp: s['support.whatsapp'] },
      maintenance: { enabled: s['maintenance.enabled'], message: s['maintenance.message'] },
      employeePerksEnabled: s['perks.employee.enabled'],
    };
  }
}
