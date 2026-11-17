import { PlatformRole } from './platform-roles';

/** Permission matrix from docs/WEB_PLATFORM_PLAN.md §3.4. Authorize by permission, never by role name. */
const ALL_STAFF: PlatformRole[] = ['super_admin', 'ride_admin', 'operations'];
const ADMINS: PlatformRole[] = ['super_admin', 'ride_admin'];

export const PERMISSIONS = {
  'fares.read': ALL_STAFF,
  'fares.write': ADMINS,
  'matching.write': ADMINS,
  'settings.read': ALL_STAFF,
  'settings.write': ADMINS,
  'settings.system': ['super_admin'],
  'promotions.read': ALL_STAFF,
  'promotions.write': ADMINS,
  'perks.write': ADMINS,
  'trips.read_all': ALL_STAFF,
  'trips.intervene': ALL_STAFF,
  'drivers.read': ALL_STAFF,
  'drivers.verify': ALL_STAFF,
  'vehicles.verify': ALL_STAFF,
  'drivers.suspend': ADMINS,
  'users.read': ALL_STAFF,
  'users.block': ADMINS,
  'support.manage': ALL_STAFF,
  'notifications.broadcast': ADMINS,
  'reports.read': ALL_STAFF,
  'reports.export': ADMINS,
  'audit.read': ADMINS,
  'trips.drive': ['driver'],
  'trips.book': ['super_admin', 'ride_admin', 'operations', 'driver', 'customer'],
} as const satisfies Record<string, readonly PlatformRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(roles: PlatformRole[] | undefined, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly PlatformRole[];
  return (roles ?? []).some((r) => allowed.includes(r));
}

export function permissionsFor(roles: PlatformRole[] | undefined): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) => hasPermission(roles, p));
}
