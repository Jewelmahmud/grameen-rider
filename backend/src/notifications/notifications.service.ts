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

  private async sendTripCreatedNotification(data: {
    tripId: string;
    passengerId: string;
    tripNumber: string;
  }) {
    if (!data.passengerId) return;
    await this.createNotification({
      userProfileId: data.passengerId,
      title: 'Trip Requested',
      body: `Your trip ${data.tripNumber} has been created. Finding a driver...`,
      notificationType: 'trip_confirmed',
      tripId: data.tripId,
    });
  }

  private async sendTripStatusNotification(data: {
    tripId: string;
    passengerId?: string;
    driverUserProfileId?: string;
    newStatus: string;
  }) {
    const statusMessages: Record<string, { title: string; body: string; type: any }> = {
      accepted:       { title: 'Driver Found',    body: 'A driver has accepted your trip.',       type: 'driver_assigned' },
      driver_arrived: { title: 'Driver Arrived',  body: 'Your driver is at the pickup location.', type: 'driver_arrived'  },
      in_progress:    { title: 'Trip Started',    body: 'Your trip is now in progress.',           type: 'trip_started'    },
      completed:      { title: 'Trip Completed',  body: 'Your trip is complete. Please rate!',    type: 'trip_completed'  },
      cancelled:      { title: 'Trip Cancelled',  body: 'Your trip has been cancelled.',           type: 'trip_cancelled'  },
    };

    const config = statusMessages[data.newStatus];
    if (!config) return;

    if (data.passengerId) {
      await this.createNotification({
        userProfileId: data.passengerId,
        title: config.title,
        body: config.body,
        notificationType: config.type,
        tripId: data.tripId,
      });
    }

    if (['in_progress', 'completed', 'cancelled'].includes(data.newStatus) && data.driverUserProfileId) {
      await this.createNotification({
        userProfileId: data.driverUserProfileId,
        title: config.title,
        body: config.body,
        notificationType: config.type,
        tripId: data.tripId,
      });
    }
  }

  private async sendPaymentNotification(data: {
    paymentId: string;
    tripId?: string;
    amount: number;
    status?: string;
  }) {
    // Payment notifications are handled by the payments flow; no-op here.
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

