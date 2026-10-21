import { Controller, Get, Put, Body, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { UserProfilesService } from './user-profiles.service';

@Controller('user-profiles')
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

  @Get('me')
  getProfile(@Request() req: ExpressRequest) {
    return req.userProfile;
  }

  @Put('fcm-token')
  async updateFcmToken(@Request() req: ExpressRequest, @Body('fcmToken') fcmToken: string) {
    await this.userProfilesService.updateFcmToken(req.auth_user_id, fcmToken);
    return { success: true };
  }
}

