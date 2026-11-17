import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from '../entities/zone.entity';
import { RouteFare } from '../entities/route-fare.entity';
import { LatLng } from './geo';

export interface ZoneFields {
  nameBn: string;
  nameEn: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusM: number;
  isActive?: boolean;
}

export interface RouteFareFields {
  originZoneId: string;
  destinationZoneId: string;
  vehicleType: string;
  fixedFare: number;
  bidirectional?: boolean;
  priority?: number;
  isActive?: boolean;
  validFrom?: Date | null;
  validTo?: Date | null;
}

const point = (alias: string) =>
  `ST_SetSRID(ST_MakePoint(${alias}.center_longitude, ${alias}.center_latitude), 4326)::geography`;

/** Zones and the fixed route fares defined between them. */
@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(RouteFare) private readonly routes: Repository<RouteFare>,
  ) {}

  /**
   * Best active route fare for this pickup/dropoff and vehicle: both ends inside the zones
   * (either direction when bidirectional), highest priority first, then the tightest zones.
   */
  async findBestRoute(pickup: LatLng, dropoff: LatLng, vehicleType: string, at: Date): Promise<RouteFare | null> {
    const rows: { id: string }[] = await this.routes.query(
      `
      SELECT rf.id
      FROM route_fares rf
      JOIN zones o ON o.id = rf.origin_zone_id AND o.is_active
      JOIN zones d ON d.id = rf.destination_zone_id AND d.is_active
      WHERE rf.is_active
        AND rf.vehicle_type = $1
        AND (rf.valid_from IS NULL OR rf.valid_from <= $6)
        AND (rf.valid_to IS NULL OR rf.valid_to > $6)
        AND (
          (ST_DWithin(${point('o')}, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, o.radius_m)
           AND ST_DWithin(${point('d')}, ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography, d.radius_m))
          OR
          (rf.bidirectional
           AND ST_DWithin(${point('o')}, ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography, o.radius_m)
           AND ST_DWithin(${point('d')}, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, d.radius_m))
        )
      ORDER BY rf.priority DESC, (o.radius_m + d.radius_m) ASC
      LIMIT 1
      `,
      [vehicleType, pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude, at],
    );
    return rows.length ? this.routes.findOne({ where: { id: rows[0].id } }) : null;
  }

  // ─── Zones ────────────────────────────────────────────────────────────────

  listZones(): Promise<Zone[]> {
    return this.zones.find({ order: { nameEn: 'ASC' } });
  }

  async getZone(id: string): Promise<Zone> {
    const zone = await this.zones.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  createZone(fields: ZoneFields, actor: string): Promise<Zone> {
    return this.zones.save(this.zones.create({ ...fields, isActive: fields.isActive ?? true, updatedBy: actor }));
  }

  async updateZone(id: string, fields: Partial<ZoneFields>, actor: string) {
    const before = await this.getZone(id);
    const after = await this.zones.save({ ...before, ...fields, updatedBy: actor });
    return { before, after };
  }

  async deleteZone(id: string) {
    const before = await this.getZone(id);
    const used = await this.routes.count({
      where: [{ originZoneId: id }, { destinationZoneId: id }],
    });
    if (used) {
      throw new ConflictException({
        code: 'ZONE_IN_USE',
        message: `This zone is used by ${used} route fare(s). Delete or change them first, or deactivate the zone.`,
      });
    }
    await this.zones.delete(id);
    return before;
  }

  // ─── Route fares ──────────────────────────────────────────────────────────

  listRoutes(vehicleType?: string): Promise<RouteFare[]> {
    return this.routes.find({
      where: vehicleType ? { vehicleType } : {},
      relations: ['originZone', 'destinationZone'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async getRoute(id: string): Promise<RouteFare> {
    const route = await this.routes.findOne({ where: { id }, relations: ['originZone', 'destinationZone'] });
    if (!route) throw new NotFoundException('Route fare not found');
    return route;
  }

  async createRoute(fields: RouteFareFields, actor: string): Promise<RouteFare> {
    await this.checkRoute(fields);
    const saved = await this.routes.save(
      this.routes.create({
        bidirectional: true,
        priority: 0,
        isActive: true,
        ...fields,
        updatedBy: actor,
      }),
    );
    return this.getRoute(saved.id);
  }

  async updateRoute(id: string, fields: Partial<RouteFareFields>, actor: string) {
    const before = await this.getRoute(id);
    const merged = { ...before, ...fields };
    await this.checkRoute(merged);
    const { originZone, destinationZone, ...plain } = merged as RouteFare;
    await this.routes.save({ ...plain, updatedBy: actor });
    return { before, after: await this.getRoute(id) };
  }

  async deleteRoute(id: string) {
    const before = await this.getRoute(id);
    await this.routes.delete(id);
    return before;
  }

  private async checkRoute(fields: Partial<RouteFareFields>) {
    if (fields.originZoneId === fields.destinationZoneId) {
      throw new BadRequestException({ code: 'SAME_ZONE', message: 'Origin and destination must be different zones' });
    }
    if (fields.validFrom && fields.validTo && new Date(fields.validFrom) >= new Date(fields.validTo)) {
      throw new BadRequestException({ code: 'INVALID_WINDOW', message: 'validFrom must be before validTo' });
    }
    await this.getZone(fields.originZoneId!);
    await this.getZone(fields.destinationZoneId!);
  }
}
