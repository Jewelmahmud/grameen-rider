import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Producer } from 'kafkajs';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { Driver } from '../entities/driver.entity';
import { DRIVER_COMMITTED_STATUSES, Trip } from '../entities/trip.entity';
import { AuthContextService } from '../auth/auth-context.service';
import { isStaff, PlatformRole } from '../common/auth/platform-roles';

interface JoinTripPayload {
  tripId: string;
}

interface DriverLocationPingPayload {
  tripId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
}

/** Identity derived server-side from the JWT at connect time. Clients can't choose it. */
interface SocketIdentity {
  userProfileId: string;
  platformRoles: PlatformRole[];
  driverId: string | null;
}

export const OPS_ROOM = 'ops';

/**
 * Socket.IO gateway. Clients connect with `auth: { token: <GiLab access token> }`.
 * The socket is closed when the token expires; clients reconnect with a refreshed token.
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly expiryTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject('KAFKA_PRODUCER') private kafkaProducer: Producer,
    @InjectRepository(Driver) private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    private readonly authContext: AuthContextService,
  ) {}

  afterInit() {
    this.logger.log('Socket.IO gateway initialized');
  }

  async handleConnection(client: Socket) {
    const token = extractToken(client);
    if (!token) return this.reject(client, 'MISSING_TOKEN');

    try {
      const { token: verified, profile, platformRoles } = await this.authContext.authenticate(token);
      const driver = platformRoles.includes('driver')
        ? await this.driverRepository.findOne({ where: { userProfileId: profile.id } })
        : null;

      const identity: SocketIdentity = { userProfileId: profile.id, platformRoles, driverId: driver?.id ?? null };
      client.data.identity = identity;
      client.join(userRoom(profile.id));
      if (isStaff(platformRoles)) client.join(OPS_ROOM);

      const msLeft = verified.exp * 1000 - Date.now();
      this.expiryTimers.set(
        client.id,
        setTimeout(() => {
          client.emit('auth_expired', { code: 'TOKEN_EXPIRED' });
          client.disconnect(true);
        }, Math.max(msLeft, 0)),
      );
      client.emit('connected', identity);
    } catch (error) {
      const code = error instanceof HttpException ? (error.getResponse() as any)?.code ?? 'INVALID_TOKEN' : 'AUTH_ERROR';
      this.reject(client, code);
    }
  }

  handleDisconnect(client: Socket) {
    const timer = this.expiryTimers.get(client.id);
    if (timer) clearTimeout(timer);
    this.expiryTimers.delete(client.id);
  }

  /** Kept for older clients: identity now comes from the token, so this only echoes it. */
  @SubscribeMessage('register')
  handleRegister(@ConnectedSocket() client: Socket) {
    return { ok: Boolean(client.data.identity), identity: client.data.identity ?? null };
  }

  /** Only the passenger, the assigned driver, or staff can follow a trip. */
  @SubscribeMessage('join_trip')
  async handleJoinTrip(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinTripPayload) {
    const identity = client.data.identity as SocketIdentity | undefined;
    if (!identity || !payload?.tripId) return { ok: false, code: 'UNAUTHORIZED' };

    const trip = await this.tripRepository.findOne({ where: { id: payload.tripId } });
    const allowed =
      trip &&
      (trip.passengerId === identity.userProfileId ||
        (identity.driverId && trip.driverId === identity.driverId) ||
        isStaff(identity.platformRoles));
    if (!allowed) return { ok: false, code: 'FORBIDDEN' };

    client.join(tripRoom(payload.tripId));
    return { ok: true };
  }

  /** Drivers report only their own location; the trip room hears it only for their own active trip. */
  @SubscribeMessage('driver_location_ping')
  async handleDriverLocationPing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DriverLocationPingPayload,
  ) {
    const identity = client.data.identity as SocketIdentity | undefined;
    if (!identity?.driverId) return { ok: false, code: 'NOT_A_DRIVER' };
    if (!isCoordinate(payload?.latitude, 90) || !isCoordinate(payload?.longitude, 180)) {
      return { ok: false, code: 'INVALID_LOCATION' };
    }

    await this.driverRepository.update(identity.driverId, {
      currentLatitude: payload.latitude,
      currentLongitude: payload.longitude,
      currentLocationUpdatedAt: new Date(),
    });

    if (!payload.tripId) return { ok: true };

    const trip = await this.tripRepository.findOne({ where: { id: payload.tripId } });
    if (!trip || trip.driverId !== identity.driverId || !DRIVER_COMMITTED_STATUSES.includes(trip.status)) {
      return { ok: true, broadcast: false };
    }

    const enriched = {
      tripId: payload.tripId,
      driverId: identity.driverId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      heading: payload.heading ?? null,
      speedKmh: payload.speedKmh ?? null,
      timestamp: new Date().toISOString(),
    };
    this.server.to(tripRoom(payload.tripId)).emit('driver.location.updated', enriched);
    this.server.to(userRoom(trip.passengerId)).emit('driver.location.updated', enriched);

    await this.kafkaProducer
      .send({ topic: 'driver-location-pings', messages: [{ key: payload.tripId, value: JSON.stringify(enriched) }] })
      .catch((e) => this.logger.warn(`Kafka location publish failed: ${e?.message ?? e}`));

    return { ok: true, broadcast: true };
  }

  emitToUser(userProfileId: string, event: string, payload: unknown) {
    this.server?.to(userRoom(userProfileId)).emit(event, payload);
  }

  emitToTrip(tripId: string, event: string, payload: unknown) {
    this.server?.to(tripRoom(tripId)).emit(event, payload);
  }

  emitToOps(event: string, payload: unknown) {
    this.server?.to(OPS_ROOM).emit(event, payload);
  }

  private reject(client: Socket, code: string) {
    client.emit('auth_error', { code });
    client.disconnect(true);
  }
}

function extractToken(client: Socket): string | null {
  const fromAuth = (client.handshake.auth as Record<string, unknown> | undefined)?.token;
  if (typeof fromAuth === 'string' && fromAuth) return fromAuth.replace(/^Bearer\s+/i, '');
  const header = client.handshake.headers?.authorization;
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
}

const userRoom = (id: string) => `user:${id}`;
const tripRoom = (id: string) => `trip:${id}`;
const isCoordinate = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;
