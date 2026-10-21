import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../entities/notification.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { FcmService } from './fcm.service';
import { SmsService } from './sms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, UserProfile])],
  providers: [NotificationsService, FcmService, SmsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

