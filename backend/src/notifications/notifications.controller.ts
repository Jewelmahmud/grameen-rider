import { Controller, Get, Put, Param, Request, Post, Body } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { NotificationsService } from './notifications.service';
import { SmsService } from './sms.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly smsService: SmsService,
  ) {}

  @Get()
  async getMyNotifications(@Request() req: ExpressRequest) {
    return this.notificationsService.findByUserProfileId(req.userProfile.id);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }

  @Post('sms/send')
  async sendSms(@Body() body: { phoneNumber: string; message: string }) {
    const result = await this.smsService.sendSms({
      phoneNumber: body.phoneNumber,
      message: body.message,
    });
    return { success: true, result };
  }
}

