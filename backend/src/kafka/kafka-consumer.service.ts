import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { TripTracking } from '../entities/trip-tracking.entity';
import { Driver } from '../entities/driver.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

interface TripBroadcastMessage {
  tripId: string;
  driverId: string;
  matchScore: number;
  estimatedArrivalMinutes: number;
}

interface TripEventMessage {
  eventType: string;
  tripId: string;
  passengerId?: string;
  driverUserProfileId?: string;
  status?: string;
  oldStatus?: string;
  tripNumber?: string;
}

interface LocationPingMessage {
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
  timestamp: string;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumers: Consumer[] = [];
  private connected = false;

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: Kafka,
    @InjectRepository(TripTracking)
    private readonly tripTrackingRepository: Repository<TripTracking>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      await this.startConsumers();
      this.connected = true;
    } catch (error) {
      this.logger.warn(
        `[KafkaConsumer] Broker unavailable, running without consumers: ${error.message}`,
      );
    }
  }

  async onModuleDestroy() {
    for (const consumer of this.consumers) {
      try {
        await consumer.disconnect();
      } catch {
        // best-effort disconnect
      }
    }
  }

  private async startConsumers() {
    await Promise.all([
      this.startTripBroadcastConsumer(),
      this.startTripEventsConsumer(),
      this.startLocationPingsConsumer(),
    ]);
  }

  private async startTripBroadcastConsumer() {
    const consumer = this.kafkaClient.consumer({
      groupId: 'grameen-ride-trip-broadcast-consumer',
    });

    await consumer.connect();
    await consumer.subscribe({ topic: 'trip-broadcasts', fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        try {
          await this.handleTripBroadcast(payload);
        } catch (error) {
          this.logger.error(`[trip-broadcasts] Error processing message: ${error.message}`);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.log('[KafkaConsumer] trip-broadcasts consumer started');
  }

  private async startTripEventsConsumer() {
    const consumer = this.kafkaClient.consumer({
      groupId: 'grameen-ride-trip-events-consumer',
    });

    await consumer.connect();
    await consumer.subscribe({ topic: 'trip-events', fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        try {
          await this.handleTripEvent(payload);
        } catch (error) {
          this.logger.error(`[trip-events] Error processing message: ${error.message}`);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.log('[KafkaConsumer] trip-events consumer started');
  }

  private async startLocationPingsConsumer() {
    const consumer = this.kafkaClient.consumer({
      groupId: 'grameen-ride-location-consumer',
    });

    await consumer.connect();
    await consumer.subscribe({ topic: 'driver-location-pings', fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        try {
          await this.handleLocationPing(payload);
        } catch (error) {
          this.logger.error(`[driver-location-pings] Error processing message: ${error.message}`);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.log('[KafkaConsumer] driver-location-pings consumer started');
  }

  private async handleTripBroadcast({ message }: EachMessagePayload) {
    const data: TripBroadcastMessage = JSON.parse(message.value?.toString() ?? '{}');
    if (!data.tripId || !data.driverId) return;

    // Find the driver's userProfileId so we can emit to their WebSocket room
    const driver = await this.driverRepository.findOne({
      where: { id: data.driverId },
      select: ['id', 'userProfileId'],
    });

    if (!driver) return;

    this.realtimeGateway.emitToUser(driver.userProfileId, 'trip.new_request', {
      tripId: data.tripId,
      matchScore: data.matchScore,
      estimatedArrivalMinutes: data.estimatedArrivalMinutes,
    });
  }

  private async handleTripEvent({ message }: EachMessagePayload) {
    const data: TripEventMessage = JSON.parse(message.value?.toString() ?? '{}');
    if (!data.eventType || !data.tripId) return;

    const { eventType, passengerId, driverUserProfileId, status, tripId, tripNumber } = data;

    if (eventType === 'trip.created' && passengerId) {
      await this.notificationsService.createNotification({
        userProfileId: passengerId,
        title: 'Trip Requested',
        body: `Your trip ${tripNumber ?? ''} has been created. Looking for a driver...`,
        notificationType: 'trip_confirmed',
        tripId,
      });
      return;
    }

    if (eventType === 'trip.status.updated' && status) {
      await this.sendStatusNotifications({
        tripId,
        status,
        passengerId,
        driverUserProfileId,
      });
    }
  }

  private async sendStatusNotifications(params: {
    tripId: string;
    status: string;
    passengerId?: string;
    driverUserProfileId?: string;
  }) {
    const { tripId, status, passengerId, driverUserProfileId } = params;

    const notificationMap: Record<
      string,
      { title: string; body: string; type: any; notifyDriver?: boolean }
    > = {
      accepted: {
        title: 'Driver Found',
        body: 'A driver has accepted your trip and is on the way.',
        type: 'driver_assigned',
      },
      driver_arrived: {
        title: 'Driver Arrived',
        body: 'Your driver has arrived at the pickup location.',
        type: 'driver_arrived',
      },
      in_progress: {
        title: 'Trip Started',
        body: 'Your trip has started. Enjoy your ride!',
        type: 'trip_started',
        notifyDriver: true,
      },
      completed: {
        title: 'Trip Completed',
        body: 'Your trip has been completed. Please rate your experience.',
        type: 'trip_completed',
        notifyDriver: true,
      },
      cancelled: {
        title: 'Trip Cancelled',
        body: 'Your trip has been cancelled.',
        type: 'trip_cancelled',
        notifyDriver: true,
      },
    };

    const config = notificationMap[status];
    if (!config) return;

    if (passengerId) {
      await this.notificationsService.createNotification({
        userProfileId: passengerId,
        title: config.title,
        body: config.body,
        notificationType: config.type,
        tripId,
      });
    }

    if (config.notifyDriver && driverUserProfileId) {
      const driverMessages: Record<string, { title: string; body: string }> = {
        in_progress: { title: 'Trip Started', body: 'The trip is now in progress.' },
        completed: { title: 'Trip Completed', body: 'The trip has been completed. Earnings added.' },
        cancelled: { title: 'Trip Cancelled', body: 'The trip was cancelled.' },
      };

      const driverMsg = driverMessages[status];
      if (driverMsg) {
        await this.notificationsService.createNotification({
          userProfileId: driverUserProfileId,
          title: driverMsg.title,
          body: driverMsg.body,
          notificationType: config.type,
          tripId,
        });
      }
    }
  }

  private async handleLocationPing({ message }: EachMessagePayload) {
    const data: LocationPingMessage = JSON.parse(message.value?.toString() ?? '{}');
    if (!data.tripId || !data.driverId) return;

    const tracking = this.tripTrackingRepository.create({
      tripId: data.tripId,
      driverId: data.driverId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading ?? null,
      speed: data.speedKmh ?? null,
    });

    await this.tripTrackingRepository.save(tracking);
  }
}
