import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query, Req } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../common/auth/permission.guard';
import { AuditService } from '../audit/audit.service';
import { FareRatesService } from '../pricing/fare-rates.service';
import { ZonesService } from '../pricing/zones.service';
import { PricingService } from '../pricing/pricing.service';
import { QuoteRequestDto } from '../pricing/dto/quote.dto';
import { ServiceType } from '../entities/trip.entity';
import { FareRateDto, RouteFareDto, UpdateRouteFareDto, UpdateZoneDto, ZoneDto } from './dto/admin.dto';

const SERVICES: ServiceType[] = ['ride', 'rental'];
const parseService = (s: string): ServiceType => {
  if (!SERVICES.includes(s as ServiceType)) throw new BadRequestException('service must be ride or rental');
  return s as ServiceType;
};
const VEHICLE_TYPE = /^[a-z][a-z0-9_]{1,19}$/;

/** Ride and rental rates, zones, route fares and the fare simulator. */
@Controller('admin')
export class AdminPricingController {
  constructor(
    private readonly rates: FareRatesService,
    private readonly zones: ZonesService,
    private readonly pricing: PricingService,
    private readonly audit: AuditService,
  ) {}

  // ─── Km-based rates ───────────────────────────────────────────────────────

  @Get('fares/rates')
  @RequirePermission('fares.read')
  listRates(@Query('service') service?: string) {
    return this.rates.listCurrent(service ? parseService(service) : undefined);
  }

  @Get('fares/rates/:service/:vehicleType/history')
  @RequirePermission('fares.read')
  rateHistory(@Param('service') service: string, @Param('vehicleType') vehicleType: string) {
    return this.rates.history(parseService(service), vehicleType);
  }

  /** Creates the next version for this service + vehicle type (also adds a new vehicle type). */
  @Put('fares/rates/:service/:vehicleType')
  @RequirePermission('fares.write')
  async saveRate(
    @Req() req: Request,
    @Param('service') service: string,
    @Param('vehicleType') vehicleType: string,
    @Body() dto: FareRateDto,
  ) {
    if (!VEHICLE_TYPE.test(vehicleType)) throw new BadRequestException('vehicleType must be lowercase letters, digits or _');
    const { before, after } = await this.rates.save(
      parseService(service),
      vehicleType,
      {
        baseFare: dto.baseFare,
        baseKm: dto.baseKm,
        perKm: dto.perKm,
        perMinute: dto.perMinute,
        minimumFare: dto.minimumFare,
        waitingPerMinute: dto.waitingPerMinute ?? 0,
        extraPassengerFare: dto.extraPassengerFare ?? 0,
        returnLegFactor: dto.returnLegFactor ?? null,
        commissionPct: dto.commissionPct ?? null,
      },
      req.auth_user_id,
    );
    await this.audit.record(req, { action: 'fare_rate.save', entity: 'fare_rate', entityId: `${service}:${vehicleType}`, before, after });
    return after;
  }

  @Post('fares/simulate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('fares.read')
  simulate(@Body() dto: QuoteRequestDto) {
    return this.pricing.simulate(dto);
  }

  // ─── Zones ────────────────────────────────────────────────────────────────

  @Get('zones')
  @RequirePermission('fares.read')
  listZones() {
    return this.zones.listZones();
  }

  @Post('zones')
  @RequirePermission('fares.write')
  async createZone(@Req() req: Request, @Body() dto: ZoneDto) {
    const zone = await this.zones.createZone(dto, req.auth_user_id);
    await this.audit.record(req, { action: 'zone.create', entity: 'zone', entityId: zone.id, after: zone });
    return zone;
  }

  @Put('zones/:id')
  @RequirePermission('fares.write')
  async updateZone(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZoneDto) {
    const { before, after } = await this.zones.updateZone(id, dto, req.auth_user_id);
    await this.audit.record(req, { action: 'zone.update', entity: 'zone', entityId: id, before, after });
    return after;
  }

  @Delete('zones/:id')
  @RequirePermission('fares.write')
  async deleteZone(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const before = await this.zones.deleteZone(id);
    await this.audit.record(req, { action: 'zone.delete', entity: 'zone', entityId: id, before });
    return { success: true };
  }

  // ─── Route fares ──────────────────────────────────────────────────────────

  @Get('route-fares')
  @RequirePermission('fares.read')
  listRoutes(@Query('vehicleType') vehicleType?: string) {
    return this.zones.listRoutes(vehicleType);
  }

  @Post('route-fares')
  @RequirePermission('fares.write')
  async createRoute(@Req() req: Request, @Body() dto: RouteFareDto) {
    const route = await this.zones.createRoute(toRouteFields(dto) as any, req.auth_user_id);
    await this.audit.record(req, { action: 'route_fare.create', entity: 'route_fare', entityId: route.id, after: route });
    return route;
  }

  @Put('route-fares/:id')
  @RequirePermission('fares.write')
  async updateRoute(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRouteFareDto) {
    const { before, after } = await this.zones.updateRoute(id, toRouteFields(dto), req.auth_user_id);
    await this.audit.record(req, { action: 'route_fare.update', entity: 'route_fare', entityId: id, before, after });
    return after;
  }

  @Delete('route-fares/:id')
  @RequirePermission('fares.write')
  async deleteRoute(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const before = await this.zones.deleteRoute(id);
    await this.audit.record(req, { action: 'route_fare.delete', entity: 'route_fare', entityId: id, before });
    return { success: true };
  }
}

function toRouteFields(dto: RouteFareDto | UpdateRouteFareDto) {
  const { validFrom, validTo, ...rest } = dto;
  return {
    ...rest,
    ...(validFrom !== undefined ? { validFrom: validFrom ? new Date(validFrom) : null } : {}),
    ...(validTo !== undefined ? { validTo: validTo ? new Date(validTo) : null } : {}),
  };
}
