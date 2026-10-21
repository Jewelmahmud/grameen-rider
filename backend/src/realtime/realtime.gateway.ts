import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Producer } from 'kafkajs';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { Driver } from '../entities/driver.entity';

interface RegisterPayload {
  userProfileId: string;
  role: 'rider' | 'driver';
}

interface JoinTripPayload {
  tripId: string;
}

interface DriverLocationPingPayload {
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    @Inject('KAFKA_PRODUCER') private kafkaProducer: Producer,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
  ) {}

  afterInit() {
    this.logger.log('Socket.IO gateway initialized');
  }

  handleConnection(client: Socket) {
    const auth = client.handshake.auth as Partial<RegisterPayload> | undefined;
    if (auth?.userProfileId) {
      this.registerClient(client, auth.userProfileId, auth.role || 'rider');
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RegisterPayload,
  ) {
    this.registerClient(client, payload.userProfileId, payload.role);
    return { ok: true };
  }

  @SubscribeMessage('join_trip')
  handleJoinTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinTripPayload,
  ) {
    client.join(this.tripRoom(payload.tripId));
    return { ok: true };
  }

  @SubscribeMessage('driver_location_ping')
  async handleDriverLocationPing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DriverLocationPingPayload,
  ) {
    await this.driverRepository.update(payload.driverId, {
      currentLatitude: payload.latitude,
      currentLongitude: payload.longitude,
      currentLocationUpdatedAt: new Date(),
    });

    const enrichedPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    this.server
      .to(this.tripRoom(payload.tripId))
      .emit('driver.location.updated', enrichedPayload);

    await this.kafkaProducer.send({
      topic: 'driver-location-pings',
      messages: [{ key: payload.tripId, value: JSON.stringify(enrichedPayload) }],
    });

    return { ok: true };
  }

  emitToUser(userProfileId: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(this.userRoom(userProfileId)).emit(event, payload);
  }

  emitToTrip(tripId: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(this.tripRoom(tripId)).emit(event, payload);
  }

  emitToRole(role: 'rider' | 'driver', event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(`role:${role}`).emit(event, payload);
  }

  private registerClient(
    client: Socket,
    userProfileId: string,
    role: 'rider' | 'driver',
  ) {
    client.join(this.userRoom(userProfileId));
    client.join(`role:${role}`);
    this.logger.log(`Socket client registered: ${userProfileId} (${role})`);
  }

  private userRoom(userProfileId: string) {
    return `user:${userProfileId}`;
  }

  private tripRoom(tripId: string) {
    return `trip:${tripId}`;
  }
}
