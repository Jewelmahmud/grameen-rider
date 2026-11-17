/**
 * Grameen Ride's own roles, derived from GiLab roles on every request.
 * Mapping rules (docs/WEB_PLATFORM_PLAN.md §3.3):
 *   admin / super_admin (global only)                  → super_admin
 *   grameen_ride_admin                                 → ride_admin
 *   grameen_ride_operations, grameen_ride_branch_admin → operations
 *   grameen_ride_driver                                → driver
 *   anything else                                      → customer (everyone is at least a customer)
 */
export const PLATFORM_ROLES = ['super_admin', 'ride_admin', 'operations', 'driver', 'customer'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const STAFF_ROLES: PlatformRole[] = ['super_admin', 'ride_admin', 'operations'];

/** A GiLab role assignment as stored on the profile (from the login response or /oauth/me). */
export interface StoredGilabRole {
  name: string;
  isGlobal: boolean;
  companyId: string | null;
  isActive: boolean;
  expiresAt: string | null;
}

const GLOBAL_ADMIN_ROLES = new Set(['admin', 'super_admin']);
const DIRECT_ROLE_MAP: Record<string, PlatformRole> = {
  grameen_ride_admin: 'ride_admin',
  grameen_ride_operations: 'operations',
  grameen_ride_branch_admin: 'operations',
  grameen_ride_driver: 'driver',
};

/** GiLab-wide admin roles only count when GiLab marks the assignment global. */
export function needsGlobalCheck(tokenRoles: string[]): boolean {
  return tokenRoles.some((r) => GLOBAL_ADMIN_ROLES.has(r));
}

export function resolvePlatformRoles(
  tokenRoles: string[],
  gilabRoles: StoredGilabRole[] | null | undefined,
  now: Date = new Date(),
): PlatformRole[] {
  const result = new Set<PlatformRole>(['customer']);

  for (const role of tokenRoles ?? []) {
    if (GLOBAL_ADMIN_ROLES.has(role)) {
      const isGlobalAssignment = (gilabRoles ?? []).some(
        (g) =>
          g.name === role &&
          g.isGlobal &&
          g.isActive !== false &&
          (!g.expiresAt || new Date(g.expiresAt) > now),
      );
      if (isGlobalAssignment) result.add('super_admin');
      continue;
    }
    const mapped = DIRECT_ROLE_MAP[role];
    if (mapped) result.add(mapped);
  }

  return PLATFORM_ROLES.filter((r) => result.has(r));
}

export function isStaff(roles: PlatformRole[] | undefined): boolean {
  return (roles ?? []).some((r) => STAFF_ROLES.includes(r));
}

/** Normalises the role list from a GiLab login response or /oauth/me into the stored shape. */
export function toStoredGilabRoles(roles: unknown): StoredGilabRole[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .filter((r) => r && typeof r.name === 'string')
    .map((r: any) => ({
      name: r.name,
      isGlobal: Boolean(r.isGlobal),
      companyId: r.assignment?.companyId ?? r.company?.id ?? null,
      isActive: r.assignment?.isActive ?? r.isActive ?? true,
      expiresAt: r.assignment?.expiresAt ?? null,
    }));
}
