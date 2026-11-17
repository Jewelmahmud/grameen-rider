import { Inject, Injectable, Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { Trip } from '../entities/trip.entity';
import { RealtimeGateway } from './realtime.gateway';

export interface TripOfferPayload {
  offerId: string;
  tripId: string;
  tripNumber: string;
  serviceType: string;
  vehicleType: string;
  pickup: { address: string; latitude: number; longitude: number };
  dropoff: { address: string; latitude: number; longitude: number };
  scheduledAt: string | null;
  distanceToPickupKm: number;
  tripDistanceKm: number | null;
  /** What the customer pays and what the driver earns. */
  total: number;
  driverEarning: number;
  paymentMethod: string | null;
  passenger: { firstName: string | null; employeeBadge: string | null };
  expiresAt: string;
}

/**
 * Sends trip events to the people involved only: the passenger, the assigned driver (via the trip
 * room or their user room), and staff in the ops room. Nothing is broadcast to all riders or drivers.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private readonly realtimeGateway: RealtimeGateway,
    @Inject('KAFKA_PRODUCER') private readonly kafkaProducer: Producer,
  ) {}

  async publishTripEvent(eventType: string, payload: Record<string, unknown>) {
    try {
      await this.kafkaProducer.send({
        topic: 'trip-events',
        messages: [
          {
            key: String(payload.tripId || eventType),
            value: JSON.stringify({ eventType, ...payload, timestamp: new Date().toISOString() }),
          },
        ],
      });
    } catch (error) {
      this.logger.warn(`Kafka publish of ${eventType} failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async notifyTripCreated(trip: Trip) {
    const payload = { tripId: trip.id, tripNumber: trip.tripNumber, status: trip.status, serviceType: trip.serviceType };
    this.realtimeGateway.emitToUser(trip.passengerId, 'trip.created', payload);
    this.realtimeGateway.emitToOps('trip.created', payload);
    await this.publishTripEvent('trip.created', { ...payload, passengerId: trip.passengerId });
  }

  notifyTripOffer(driverUserProfileId: string, offer: TripOfferPayload) {
    this.realtimeGateway.emitToUser(driverUserProfileId, 'trip.offer', offer);
  }

  notifyOfferClosed(driverUserProfileId: string, payload: { offerId: string; tripId: string; reason: string }) {
    this.realtimeGateway.emitToUser(driverUserProfileId, 'trip.offer.closed', payload);
  }

  notifyDriverPaused(driverUserProfileId: string, payload: { until: string; reason: string }) {
    this.realtimeGateway.emitToUser(driverUserProfileId, 'dispatch.paused', payload);
  }

  async notifyTripStatusUpdated(trip: Trip, oldStatus: string, driverUserProfileId?: string | null) {
    const payload = {
      tripId: trip.id,
      status: trip.status,
      oldStatus,
      serviceType: trip.serviceType,
      driverId: trip.driverId || null,
    };

    this.realtimeGateway.emitToUser(trip.passengerId, 'trip.status.updated', payload);
    this.realtimeGateway.emitToTrip(trip.id, 'trip.status.updated', payload);
    if (driverUserProfileId) this.realtimeGateway.emitToUser(driverUserProfileId, 'trip.status.updated', payload);
    this.realtimeGateway.emitToOps('trip.status.updated', payload);

    await this.publishTripEvent('trip.status.updated', payload);
  }

  notifyOps(event: string, payload: unknown) {
    this.realtimeGateway.emitToOps(event, payload);
  }

  notifyUser(userProfileId: string, event: string, payload: unknown) {
    this.realtimeGateway.emitToUser(userProfileId, event, payload);
  }
}
