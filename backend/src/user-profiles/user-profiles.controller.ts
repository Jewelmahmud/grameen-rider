import { Controller, Get, Put, Body, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { UserProfilesService } from './user-profiles.service';
import { EmployeePerksService } from '../perks/employee-perks.service';
import { permissionsFor } from '../common/auth/permissions';
import { isStaff } from '../common/auth/platform-roles';

class FcmTokenDto {
  @IsString() @MaxLength(4096) fcmToken: string;
}

class LanguageDto {
  @IsIn(['bn', 'en']) languagePreference: 'bn' | 'en';
}

@Controller('user-profiles')
export class UserProfilesController {
  constructor(
    private readonly userProfilesService: UserProfilesService,
    private readonly perks: EmployeePerksService,
  ) {}

  /**
   * The caller's profile plus what the apps need to decide what to show: platform roles,
   * permissions (the web console builds its menu from these) and employee sparks.
   */
  @Get('me')
  async getProfile(@Request() req: ExpressRequest) {
    const { gilabRoles, gilabRolesSyncedAt, employeeSyncedAt, fcmToken, ...profile } = req.userProfile;
    return {
      ...profile,
      platformRoles: req.platformRoles,
      permissions: permissionsFor(req.platformRoles),
      isStaff: isStaff(req.platformRoles),
      sparks: await this.perks.sparks(req.userProfile),
    };
  }

  @Put('fcm-token')
  async updateFcmToken(@Request() req: ExpressRequest, @Body() body: FcmTokenDto) {
    await this.userProfilesService.updateFcmToken(req.auth_user_id, body.fcmToken);
    return { success: true };
  }

  @Put('language')
  async updateLanguage(@Request() req: ExpressRequest, @Body() body: LanguageDto) {
    await this.userProfilesService.updateLanguage(req.userProfile.id, body.languagePreference);
    return { success: true };
  }
}
