import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { csvCell } from '../admin/reports.service';

describe('SettingsService', () => {
  let rows: any[];
  let service: SettingsService;

  beforeEach(() => {
    rows = [];
    const repo = {
      find: jest.fn(async () => rows),
      create: jest.fn((x) => x),
      save: jest.fn(async (items: any[]) => {
        for (const item of items) {
          const i = rows.findIndex((r) => r.settingKey === item.settingKey);
          if (i >= 0) rows[i] = item;
          else rows.push(item);
        }
        return items;
      }),
    };
    service = new SettingsService(repo as any);
  });

  it('returns code defaults until an admin changes a value', async () => {
    expect(await service.get('perks.employee.discountPct')).toBe(10);
    expect(await service.get('service.ride.vehicleTypes')).toEqual(['motorcycle', 'car', 'auto', 'van', 'rickshaw']);
  });

  it('stores typed values and records who changed them', async () => {
    const result = await service.update(
      { 'perks.employee.discountPct': 15, 'matching.employeePriority': false },
      { authUserId: 'admin-1', roles: ['ride_admin'] },
    );
    expect(result.before).toEqual({ 'perks.employee.discountPct': 10, 'matching.employeePriority': true });
    expect(await service.get('perks.employee.discountPct')).toBe(15);
    expect(await service.get('matching.employeePriority')).toBe(false);
    expect(rows[0].updatedByAuthUserId).toBe('admin-1');
  });

  it('checks each key against its own permission', async () => {
    await expect(
      service.update({ 'commission.defaultPct': 12 }, { authUserId: 'a', roles: ['ride_admin'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.update({ 'commission.defaultPct': 12 }, { authUserId: 'a', roles: ['super_admin'] }),
    ).resolves.toBeDefined();
    await expect(
      service.update({ 'matching.weights.fairness': 0.5 }, { authUserId: 'a', roles: ['operations'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unknown keys, wrong types and out-of-range values', async () => {
    const admin = { authUserId: 'a', roles: ['super_admin' as const] };
    await expect(service.update({ 'no.such.key': 1 }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update({ 'perks.employee.discountPct': 'ten' }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update({ 'perks.employee.discountPct': 150 }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update({ 'pricing.night.start': '25:00' }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update({ 'service.ride.vehicleTypes': 'car' }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falls back to the default when a stored value is corrupt', async () => {
    rows = [{ settingKey: 'perks.employee.discountPct', settingValue: 'abc', settingType: 'number' }];
    expect(await service.get('perks.employee.discountPct')).toBe(10);
  });

  it('exposes only public settings in the public config', async () => {
    const keys = Object.keys(await service.publicConfig());
    expect(keys).toContain('service.ride.vehicleTypes');
    expect(keys).not.toContain('commission.defaultPct');
    expect(keys).not.toContain('matching.weights.fairness');
  });
});

describe('csvCell', () => {
  it('quotes commas and quotes, and defuses spreadsheet formulas', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell(null)).toBe('');
  });
});
