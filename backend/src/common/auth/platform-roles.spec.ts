import { resolvePlatformRoles, StoredGilabRole, toStoredGilabRoles } from './platform-roles';
import { hasPermission } from './permissions';

const role = (name: string, over: Partial<StoredGilabRole> = {}): StoredGilabRole => ({
  name,
  isGlobal: false,
  companyId: 'company-x',
  isActive: true,
  expiresAt: null,
  ...over,
});

describe('resolvePlatformRoles', () => {
  it('gives everyone the customer role', () => {
    expect(resolvePlatformRoles([], null)).toEqual(['customer']);
    expect(resolvePlatformRoles(['grameen_bazaar_vendor', 'pathshala_user'], null)).toEqual(['customer']);
  });

  it('maps a global GiLab admin or super_admin to super_admin', () => {
    expect(resolvePlatformRoles(['admin'], [role('admin', { isGlobal: true, companyId: null })])).toEqual([
      'super_admin',
      'customer',
    ]);
    expect(resolvePlatformRoles(['super_admin'], [role('super_admin', { isGlobal: true })])).toContain('super_admin');
  });

  it('treats a company-scoped admin of another Grameen company as a customer', () => {
    expect(resolvePlatformRoles(['admin'], [role('admin', { isGlobal: false })])).toEqual(['customer']);
  });

  it('treats admin as customer when the role details are unknown', () => {
    expect(resolvePlatformRoles(['admin'], null)).toEqual(['customer']);
  });

  it('ignores an expired or deactivated global admin assignment', () => {
    const now = new Date('2026-11-16T00:00:00Z');
    expect(
      resolvePlatformRoles(['admin'], [role('admin', { isGlobal: true, expiresAt: '2026-11-01T00:00:00Z' })], now),
    ).toEqual(['customer']);
    expect(resolvePlatformRoles(['admin'], [role('admin', { isGlobal: true, isActive: false })], now)).toEqual([
      'customer',
    ]);
  });

  it('maps the Grameen Ride roles, including branch admin as operations', () => {
    expect(resolvePlatformRoles(['grameen_ride_admin'], null)).toEqual(['ride_admin', 'customer']);
    expect(resolvePlatformRoles(['grameen_ride_operations'], null)).toEqual(['operations', 'customer']);
    expect(resolvePlatformRoles(['grameen_ride_branch_admin'], null)).toEqual(['operations', 'customer']);
    expect(resolvePlatformRoles(['grameen_ride_driver', 'customer'], null)).toEqual(['driver', 'customer']);
  });
});

describe('toStoredGilabRoles', () => {
  it('reads login-response and /oauth/me role shapes', () => {
    expect(
      toStoredGilabRoles([
        { name: 'admin', isGlobal: true, assignment: { companyId: null, isActive: true, expiresAt: null } },
        { name: 'customer', isGlobal: true, company: { id: 'c1' } },
        { nope: true },
      ]),
    ).toEqual([
      { name: 'admin', isGlobal: true, companyId: null, isActive: true, expiresAt: null },
      { name: 'customer', isGlobal: true, companyId: 'c1', isActive: true, expiresAt: null },
    ]);
  });
});

describe('permission matrix', () => {
  it('lets operations run trips and verify drivers but not change fares, promotions or block users', () => {
    const ops = ['operations', 'customer'] as const;
    expect(hasPermission([...ops], 'trips.intervene')).toBe(true);
    expect(hasPermission([...ops], 'drivers.verify')).toBe(true);
    expect(hasPermission([...ops], 'fares.write')).toBe(false);
    expect(hasPermission([...ops], 'promotions.write')).toBe(false);
    expect(hasPermission([...ops], 'users.block')).toBe(false);
  });

  it('keeps system settings to super admins', () => {
    expect(hasPermission(['ride_admin'], 'settings.system')).toBe(false);
    expect(hasPermission(['super_admin'], 'settings.system')).toBe(true);
  });

  it('gives customers no console permissions', () => {
    expect(hasPermission(['customer'], 'trips.read_all')).toBe(false);
    expect(hasPermission(['customer'], 'trips.book')).toBe(true);
    expect(hasPermission(['customer'], 'trips.drive')).toBe(false);
  });
});
