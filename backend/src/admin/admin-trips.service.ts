import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { DRIVER_COMMITTED_STATUSES, Trip, TripStatus } from '../entities/trip.entity';
import { TripOffer } from '../entities/trip-offer.entity';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { TripsService } from '../trips/trips.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ListTripsQueryDto } from './dto/admin.dto';

const ASSIGNABLE: TripStatus[] = ['scheduled', 'searching_driver', 'no_driver_found'];
const REDISPATCHABLE: TripStatus[] = ['scheduled', 'searching_driver', 'no_driver_found'];

@Injectable()
export class AdminTripsService {
  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripOffer) private readonly offers: Repository<TripOffer>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly tripsService: TripsService,
    private readonly dispatch: DispatchService,
    private readonly realtime: RealtimeService,
    private readonly events: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  async list(q: ListTripsQueryDto) {
    const pageSize = q.pageSize ?? 25;
    const page = q.page ?? 1;
    const qb = this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.passenger', 'p')
      .leftJoinAndSelect('t.driver', 'd')
      .leftJoinAndSelect('d.userProfile', 'du')
      .orderBy('t.requestedAt', 'DESC')
      .take(pageSize)
      .skip((page - 1) * pageSize);

    if (q.status) qb.andWhere('t.status IN (:...statuses)', { statuses: q.status.split(',') });
    if (q.service) qb.andWhere('t.service_type = :service', { service: q.service });
    if (q.vehicleType) qb.andWhere('t.vehicle_type = :vt', { vt: q.vehicleType });
    if (q.from) qb.andWhere('t.requested_at >= :from', { from: new Date(q.from) });
    if (q.to) qb.andWhere('t.requested_at < :to', { to: new Date(q.to) });
    if (q.driverId) qb.andWhere('t.driver_id = :driverId', { driverId: q.driverId });
    if (q.passengerId) qb.andWhere('t.passenger_id = :passengerId', { passengerId: q.passengerId });
    if (q.employee) qb.andWhere('t.is_employee_booking = :emp', { emp: q.employee === 'true' });
    if (q.q) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('t.trip_number ILIKE :q')
            .orWhere('t.pickup_address ILIKE :q')
            .orWhere('t.dropoff_address ILIKE :q')
            .orWhere('p.phone_number ILIKE :q'),
        ),
        { q: `%${q.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` },
      );
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  /** Trip with every dispatch offer (who was offered, score, outcome), for the console timeline. */
  async detail(id: string) {
    const trip = await this.trips.findOne({ where: { id }, relations: ['passenger', 'driver', 'driver.userProfile', 'vehicle'] });
    if (!trip) throw new NotFoundException('Trip not found');
    const offers = await this.offers.find({ where: { tripId: id }, relations: ['driver', 'driver.userProfile'], order: { offeredAt: 'ASC' } });
    return { trip, offers };
  }

  async cancel(id: string, reason: string) {
    const trip = await this.tripsService.findById(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const before = { status: trip.status, driverId: trip.driverId };
    const after = await this.tripsService.cancel(trip, 'system', reason);
    return { before, after };
  }

  /** Staff pick the driver themselves (e.g. a rental nobody accepted). Closes any open offer. */
  async assign(id: string, driverId: string, vehicleId: string | undefined, actorAuthUserId: string) {
    const trip = await this.trips.findOne({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!ASSIGNABLE.includes(trip.status)) {
      throw new BadRequestException({ code: 'NOT_ASSIGNABLE', message: `A trip in "${trip.status}" cannot be assigned` });
    }

    const driver = await this.drivers.findOne({ where: { id: driverId }, relations: ['userProfile'] });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.isSuspended || driver.verificationStatus !== 'approved') {
      throw new BadRequestException({ code: 'DRIVER_NOT_ELIGIBLE', message: 'Driver is suspended or not approved' });
    }
    const vehicle = vehicleId
      ? await this.vehicles.findOne({ where: { id: vehicleId, driverId } })
      : await this.vehicles.findOne({ where: { driverId, vehicleType: trip.vehicleType as Vehicle['vehicleType'], isActive: true } });
    if (!vehicle || vehicle.vehicleType !== trip.vehicleType) {
      throw new BadRequestException({ code: 'NO_MATCHING_VEHICLE', message: `Driver has no active ${trip.vehicleType}` });
    }
    if (trip.serviceType === 'ride') {
      const busy = await this.trips.exist({ where: { driverId, serviceType: 'ride', status: In(DRIVER_COMMITTED_STATUSES) } });
      if (busy) throw new ConflictException({ code: 'DRIVER_UNAVAILABLE', message: 'Driver is on another ride' });
    }

    await this.dispatch.closeOffers(id, 'assigned_by_staff');
    const oldStatus = trip.status;
    await this.dataSource.transaction(async (m) => {
      const now = new Date();
      await m.getRepository(TripOffer).insert({
        tripId: id,
        driverId,
        vehicleId: vehicle.id,
        wave: 0,
        score: 0,
        distanceKm: 0,
        outcome: 'accepted',
        offeredAt: now,
        expiresAt: now,
        respondedAt: now,
      });
      await m.getRepository(Trip).update(id, { driverId, vehicleId: vehicle.id, status: 'accepted', acceptedAt: now });
      if (trip.serviceType === 'ride') await m.getRepository(Driver).update(driverId, { isAvailable: false });
    });

    const updated = await this.trips.findOne({ where: { id }, relations: ['driver', 'vehicle'] });
    this.events.emit('trip.status.changed', {
      tripId: id,
      passengerId: updated.passengerId,
      driverUserProfileId: driver.userProfileId,
      oldStatus,
      newStatus: updated.status,
      assignedBy: actorAuthUserId,
    });
    await this.realtime.notifyTripStatusUpdated(updated, oldStatus, driver.userProfileId);
    this.realtime.notifyUser(driver.userProfileId, 'trip.assigned_to_you', { tripId: id, tripNumber: updated.tripNumber });
    this.realtime.notifyUser(updated.passengerId, 'trip.assigned', { tripId: id });
    return { before: { status: oldStatus, driverId: trip.driverId }, after: updated };
  }

  /** Restarts the search now. Drivers offered in earlier runs may be offered again. */
  async redispatch(id: string) {
    const trip = await this.trips.findOne({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!REDISPATCHABLE.includes(trip.status)) {
      throw new BadRequestException({ code: 'NOT_REDISPATCHABLE', message: `A trip in "${trip.status}" cannot be redispatched` });
    }
    await this.dispatch.closeOffers(id, 'redispatched');
    const oldStatus = trip.status;
    await this.trips.update(id, { status: 'searching_driver' });
    trip.status = 'searching_driver';
    await this.realtime.notifyTripStatusUpdated(trip, oldStatus);
    await this.dispatch.start(trip);
    return { before: { status: oldStatus }, after: { status: trip.status } };
  }

  /** Rentals starting in the next `hours`, assigned or not, for the operations board. */
  upcomingRentals(hours = 24) {
    const until = new Date(Date.now() + hours * 3_600_000);
    return this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.passenger', 'p')
      .leftJoinAndSelect('t.driver', 'd')
      .leftJoinAndSelect('d.userProfile', 'du')
      .leftJoinAndSelect('t.vehicle', 'v')
      .where("t.service_type = 'rental'")
      .andWhere('t.scheduled_datetime <= :until', { until })
      .andWhere('t.scheduled_datetime >= :from', { from: new Date(Date.now() - 3_600_000) })
      .andWhere("t.status NOT IN ('completed', 'cancelled')")
      .orderBy('t.scheduledDatetime', 'ASC')
      .getMany();
  }
}
