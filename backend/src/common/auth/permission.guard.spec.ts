import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';

const context = (platformRoles: string[] | undefined, type = 'http') =>
  ({
    getType: () => type,
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ platformRoles }) }),
  }) as unknown as ExecutionContext;

describe('PermissionGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionGuard(reflector);

  afterEach(() => jest.restoreAllMocks());

  it('allows handlers without a permission requirement', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(context(undefined))).toBe(true);
  });

  it('allows a role that holds the permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['fares.write']);
    expect(guard.canActivate(context(['ride_admin', 'customer']))).toBe(true);
  });

  it('rejects a role without it', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['fares.write']);
    expect(() => guard.canActivate(context(['operations', 'customer']))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context(undefined))).toThrow(ForbiddenException);
  });

  it('requires every listed permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['fares.read', 'settings.system']);
    expect(() => guard.canActivate(context(['ride_admin']))).toThrow(ForbiddenException);
  });
});
