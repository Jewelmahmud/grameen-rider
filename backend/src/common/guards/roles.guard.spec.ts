import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const makeContext = (roles: string[], handlerRoles?: string[], classRoles?: string[]): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: { roles } }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext);

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow when no roles metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext([]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const ctx = makeContext(['admin', 'user']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const ctx = makeContext(['user']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw when user has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const ctx = makeContext([]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow when one of multiple required roles matches', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'moderator']);
    const ctx = makeContext(['moderator']);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
