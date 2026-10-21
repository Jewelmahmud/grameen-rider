import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FcmService } from './fcm.service';
import { SmsService } from './sms.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private eventEmitter: EventEmitter2,
    private fcmService: FcmService,
    private smsService: SmsService,
  ) {}

  onModuleInit() {
    // Listen to trip events
    this.eventEmitter.on('trip.created', async (data) => {
      await this.sendTripCreatedNotification(data);
    });

    this.eventEmitter.on('trip.status.changed', async (data) => {
      await this.sendTripStatusNotification(data);
    });

    this.eventEmitter.on('payment.created', async (data) => {
      await this.sendPaymentNotification(data);
    });
  }

  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    const savedNotification = await this.notificationRepository.save(notification);

    // Load user profile to get FCM token
    const userProfile = await this.notificationRepository.manager.findOne(
      UserProfile,
      { where: { id: data.userProfileId } },
    );

    // Send FCM notification
    if (userProfile?.fcmToken) {
      await this.fcmService.sendNotification({
        token: userProfile.fcmToken,
        title: savedNotification.title,
        body: savedNotification.body,
        data: savedNotification.data,
      });

      savedNotification.fcmSent = true;
      savedNotification.fcmSentAt = new Date();
      await this.notificationRepository.save(savedNotification);
    }

    // Send SMS for important notification types (or when explicitly requested)
    const shouldSendSms =
      data.sendSms === true ||
      ['trip_confirmed', 'driver_assigned', 'trip_started', 'trip_completed', 'payment_failed'].includes(
        data.notificationType,
      );

    if (shouldSendSms && userProfile?.phoneNumber) {
      try {
        await this.smsService.sendSms({
          phoneNumber: userProfile.phoneNumber,
          message: `${savedNotification.title}: ${savedNotification.body}`,
        });
      } catch (error) {
        console.error('Failed to send SMS notification:', error);
      }
    }

    return savedNotification;
  }

  async findByUserProfileId(userProfileId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, {
      isRead: true,
      readAt: new Date(),
    });
  }

  private async sendTripCreatedNotification(data: any) {
    // Implementation for trip created notification
  }

  private async sendTripStatusNotification(data: any) {
    // Implementation for trip status notification
  }

  private async sendPaymentNotification(data: any) {
    // Implementation for payment notification
  }
}

interface CreateNotificationDto {
  userProfileId: string;
  title: string;
  body: string;
  notificationType: Notification['notificationType'];
  data?: Record<string, any>;
  tripId?: string;
  sendSms?: boolean;
}

