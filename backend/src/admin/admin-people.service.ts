import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Trip } from '../entities/trip.entity';
import { TripOffer } from '../entities/trip-offer.entity';
import { ListDriversQueryDto, ListUsersQueryDto, UpdateVehicleDto } from './dto/admin.dto';

const page = (q: { page?: number; pageSize?: number }) => {
  const pageSize = q.pageSize ?? 25;
  const p = q.page ?? 1;
  return { take: pageSize, skip: (p - 1) * pageSize, page: p, pageSize };
};
const like = (q: string) => `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

@Injectable()
export class AdminPeopleService {
  constructor(
    @InjectRepository(UserProfile) private readonly users: Repository<UserProfile>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripOffer) private readonly offers: Repository<TripOffer>,
  ) {}

  // ─── Customers / all users ────────────────────────────────────────────────

  async listUsers(q: ListUsersQueryDto) {
    const p = page(q);
    const qb = this.users.createQueryBuilder('u').orderBy('u.created_at', 'DESC').take(p.take).skip(p.skip);
    if (q.q) {
      qb.andWhere(
        "(u.first_name ILIKE :q OR u.last_name ILIKE :q OR u.phone_number ILIKE :q OR u.email ILIKE :q OR u.designation ILIKE :q)",
        { q: like(q.q) },
      );
    }
    if (q.role) qb.andWhere(':role = ANY(u.platform_roles)', { role: q.role });
    if (q.employee) qb.andWhere('u.is_employee = :employee', { employee: q.employee === 'true' });
    if (q.status) qb.andWhere('u.status = :status', { status: q.status });
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map(publicUser), total, page: p.page, pageSize: p.pageSize };
  }

  async getUser(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const stats = await this.trips
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('count(*)::int', 'count')
      .where('t.passenger_id = :id', { id })
      .groupBy('t.status')
      .getRawMany();
    const driver = await this.drivers.findOne({ where: { userProfileId: id } });
    return { ...publicUser(user), tripsByStatus: stats, driverId: driver?.id ?? null };
  }

  async setBlocked(id: string, blocked: boolean, reason: string | null, actorProfileId: string) {
    if (id === actorProfileId) throw new BadRequestException({ code: 'CANNOT_BLOCK_SELF', message: 'You cannot block yourself' });
    const before = await this.users.findOne({ where: { id } });
    if (!before) throw new NotFoundException('User not found');
    await this.users.update(id, { status: blocked ? 'blocked' : 'active', blockedReason: blocked ? reason : null });
    const after = await this.users.findOne({ where: { id } });
    return { before: publicUser(before), after: publicUser(after) };
  }

  // ─── Drivers ──────────────────────────────────────────────────────────────

  async listDrivers(q: ListDriversQueryDto) {
    const p = page(q);
    const qb = this.drivers
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.userProfile', 'u')
      .leftJoinAndSelect('d.vehicles', 'v')
      .orderBy('d.created_at', 'DESC')
      .take(p.take)
      .skip(p.skip);
    if (q.q) {
      qb.andWhere(
        '(u.first_name ILIKE :q OR u.last_name ILIKE :q OR u.phone_number ILIKE :q OR d.license_number ILIKE :q OR v.license_plate ILIKE :q)',
        { q: like(q.q) },
      );
    }
    if (q.verification) qb.andWhere('d.verification_status = :v', { v: q.verification });
    if (q.suspended) qb.andWhere('d.is_suspended = :s', { s: q.suspended === 'true' });
    if (q.online) qb.andWhere('d.is_online = :o', { o: q.online === 'true' });
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: p.page, pageSize: p.pageSize };
  }

  async getDriver(id: string) {
    const driver = await this.drivers.findOne({ where: { id }, relations: ['userProfile', 'vehicles'] });
    if (!driver) throw new NotFoundException('Driver not found');
    const since = new Date(Date.now() - 30 * 86_400_000);
    const offerStats = await this.offers
      .createQueryBuilder('o')
      .select('o.outcome', 'outcome')
      .addSelect('count(*)::int', 'count')
      .where('o.driver_id = :id AND o.offered_at >= :since', { id, since })
      .groupBy('o.outcome')
      .getRawMany<{ outcome: string; count: number }>();
    const offered = offerStats.reduce((s, r) => s + Number(r.count), 0);
    const accepted = Number(offerStats.find((r) => r.outcome === 'accepted')?.count ?? 0);
    return {
      ...driver,
      last30Days: {
        offers: offerStats,
        acceptRate: offered ? Math.round((accepted / offered) * 100) / 100 : null,
      },
    };
  }

  async setSuspended(id: string, suspended: boolean, reason: string | null) {
    const before = await this.drivers.findOne({ where: { id } });
    if (!before) throw new NotFoundException('Driver not found');
    await this.drivers.update(id, {
      isSuspended: suspended,
      suspendedReason: suspended ? reason : null,
      ...(suspended ? { isOnline: false, isAvailable: false } : {}),
    });
    return { before, after: await this.drivers.findOne({ where: { id } }) };
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────

  async updateVehicle(id: string, dto: UpdateVehicleDto) {
    const before = await this.vehicles.findOne({ where: { id } });
    if (!before) throw new NotFoundException('Vehicle not found');
    await this.vehicles.update(id, dto);
    return { before, after: await this.vehicles.findOne({ where: { id } }) };
  }
}

/** Never leak push tokens or raw GiLab role data to the console. */
function publicUser(u: UserProfile) {
  const { fcmToken, gilabRoles, ...rest } = u;
  return rest;
}
