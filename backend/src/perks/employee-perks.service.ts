import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { SettingsService } from '../settings/settings.service';
import { dhakaMonthStart } from '../pricing/geo';
import { employeeDiscountAmount } from '../pricing/fare-engine';
import { PromoAudienceContext } from '../promotions/promotions.service';

export interface Sparks {
  isEmployee: boolean;
  designation: string | null;
  /** "GiLab কর্মী · {designation}" when shown; null otherwise. */
  badge: string | null;
  greetingName: string | null;
  discountPct: number;
  monthlyCapBdt: number;
  usedThisMonthBdt: number;
  remainingThisMonthBdt: number;
  vehicleTypes: string[];
  priorityDispatch: boolean;
}

/** GiLab employee "sparks" (docs/WEB_PLATFORM_PLAN.md §3.5). Every number comes from admin settings. */
@Injectable()
export class EmployeePerksService {
  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    private readonly settings: SettingsService,
  ) {}

  async isActiveFor(profile: Pick<UserProfile, 'isEmployee'>): Promise<boolean> {
    return Boolean(profile.isEmployee) && (await this.settings.get<boolean>('perks.employee.enabled'));
  }

  async sparks(profile: UserProfile, now = new Date()): Promise<Sparks> {
    const s = await this.settings.getMany([
      'perks.employee.enabled',
      'perks.employee.showDesignation',
      'perks.employee.discountPct',
      'perks.employee.monthlyCapBdt',
      'perks.employee.vehicleTypes',
      'matching.employeePriority',
    ]);
    const active = Boolean(profile.isEmployee) && s['perks.employee.enabled'];
    const used = active ? await this.usedThisMonth(profile.id, now) : 0;
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null;
    const showDesignation = active && s['perks.employee.showDesignation'] && profile.designation;

    return {
      isEmployee: active,
      designation: active ? profile.designation : null,
      badge: active ? badgeText(profile.designation) : null,
      greetingName: showDesignation ? `${name ?? ''} · ${profile.designation}`.trim() : name,
      discountPct: active ? s['perks.employee.discountPct'] : 0,
      monthlyCapBdt: active ? s['perks.employee.monthlyCapBdt'] : 0,
      usedThisMonthBdt: used,
      remainingThisMonthBdt: active ? Math.max(0, s['perks.employee.monthlyCapBdt'] - used) : 0,
      vehicleTypes: s['perks.employee.vehicleTypes'],
      priorityDispatch: active && s['matching.employeePriority'],
    };
  }

  /** Employee discount for one fare, after the monthly cap. 0 for non-employees. */
  async discountFor(profile: UserProfile, vehicleType: string, fare: number, now = new Date()): Promise<number> {
    if (!(await this.isActiveFor(profile))) return 0;
    const s = await this.settings.getMany([
      'perks.employee.discountPct',
      'perks.employee.monthlyCapBdt',
      'perks.employee.vehicleTypes',
    ]);
    const types: string[] = s['perks.employee.vehicleTypes'] ?? [];
    if (types.length && !types.includes(vehicleType)) return 0;
    return employeeDiscountAmount(fare, {
      pct: s['perks.employee.discountPct'],
      monthlyCap: s['perks.employee.monthlyCapBdt'],
      usedThisMonth: await this.usedThisMonth(profile.id, now),
    });
  }

  /** Badge drivers see on the offer card and active trip; null when the admin turned it off. */
  async badgeForDriver(profile: Pick<UserProfile, 'isEmployee' | 'designation'>): Promise<string | null> {
    if (!(await this.isActiveFor(profile))) return null;
    if (!(await this.settings.get<boolean>('perks.employee.showBadgeToDriver'))) return null;
    return badgeText(profile.designation);
  }

  async audienceContext(profile: UserProfile): Promise<PromoAudienceContext> {
    const completedTrips = await this.trips.count({ where: { passengerId: profile.id, status: 'completed' } });
    return { isEmployee: await this.isActiveFor(profile), completedTrips };
  }

  private async usedThisMonth(passengerId: string, now: Date): Promise<number> {
    const row = await this.trips
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.employee_discount_amount), 0)', 'used')
      .where('t.passenger_id = :passengerId', { passengerId })
      .andWhere('t.requested_at >= :from', { from: dhakaMonthStart(now) })
      .andWhere("t.status NOT IN ('cancelled', 'no_driver_found')")
      .getRawOne<{ used: string }>();
    return Number(row?.used ?? 0);
  }
}

function badgeText(designation: string | null): string {
  return designation ? `GiLab কর্মী · ${designation}` : 'GiLab কর্মী';
}
