import { Inject, Injectable } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { Trip } from '../entities/trip.entity';
import { RealtimeGateway } from './realtime.gateway';

interface DriverMatchLike {
  id: string;
  userProfileId?: string;
  user_profile_id?: string;
  match_score?: number;
  distance_km?: number;
}

@Injectable()
export class RealtimeService {
  constructor(
    private readonly realtimeGateway: RealtimeGateway,
    @Inject('KAFKA_PRODUCER') private readonly kafkaProducer: Producer,
  ) {}

  async publishTripEvent(eventType: string, payload: Record<string, unknown>) {
    await this.kafkaProducer.send({
      topic: 'trip-events',
      messages: [
        {
          key: String(payload.tripId || eventType),
          value: JSON.stringify({
            eventType,
            ...payload,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  }

  async notifyTripCreated(trip: Trip) {
    this.realtimeGateway.emitToUser(trip.passengerId, 'trip.created', {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      status: trip.status,
    });
    this.realtimeGateway.emitToRole('rider', 'trip.created', {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      status: trip.status,
    });

    await this.publishTripEvent('trip.created', {
      tripId: trip.id,
      passengerId: trip.passengerId,
      status: trip.status,
      tripNumber: trip.tripNumber,
    });
  }

  async notifyTripBroadcastToDrivers(trip: Trip, potentialDrivers: DriverMatchLike[]) {
    const requestPayload = {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      pickupAddress: trip.pickupAddress,
      dropoffAddress: trip.dropoffAddress,
      vehicleType: trip.vehicleType,
      totalFare: trip.totalFare,
    };

    for (const driver of potentialDrivers) {
      const userProfileId = driver.userProfileId || driver.user_profile_id;
      if (!userProfileId) continue;

      this.realtimeGateway.emitToUser(userProfileId, 'trip.new_request', {
        ...requestPayload,
        matchScore: driver.match_score || null,
        distanceKm: driver.distance_km || null,
      });
    }

    this.realtimeGateway.emitToRole('driver', 'trip.new_request', requestPayload);

    await this.publishTripEvent('trip.broadcasted', {
      tripId: trip.id,
      candidateCount: potentialDrivers.length,
    });
  }

  async notifyTripStatusUpdated(trip: Trip, oldStatus: string) {
    const payload = {
      tripId: trip.id,
      status: trip.status,
      oldStatus,
      driverId: trip.driverId || null,
    };

    this.realtimeGateway.emitToUser(trip.passengerId, 'trip.status.updated', payload);
    if (trip.driverId) {
      this.realtimeGateway.emitToTrip(trip.id, 'trip.status.updated', payload);
    }
    this.realtimeGateway.emitToRole('rider', 'trip.status.updated', payload);
    this.realtimeGateway.emitToRole('driver', 'trip.status.updated', payload);

    await this.publishTripEvent('trip.status.updated', payload);
  }

  async notifyDriverLocation(payload: {
    tripId: string;
    driverId: string;
    latitude: number;
    longitude: number;
  }) {
    const enrichedPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    this.realtimeGateway.emitToTrip(payload.tripId, 'driver.location.updated', enrichedPayload);

    await this.kafkaProducer.send({
      topic: 'driver-location-pings',
      messages: [{ key: payload.tripId, value: JSON.stringify(enrichedPayload) }],
    });
  }
}
