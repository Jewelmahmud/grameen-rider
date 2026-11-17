import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { hasPermission, Permission } from './permissions';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** All listed permissions are required. Applies to HTTP handlers only. */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const roles = request.platformRoles ?? [];
    const missing = required.filter((p) => !hasPermission(roles, p));
    if (missing.length) {
      throw new ForbiddenException({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        message: `Missing permission: ${missing.join(', ')}`,
      });
    }
    return true;
  }
}
