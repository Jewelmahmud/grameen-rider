import { HttpException, Injectable, Logger, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthContextService } from './auth-context.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(private readonly authContext: AuthContextService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(new UnauthorizedException({ error: 'No token provided', code: 'MISSING_TOKEN' }));
    }
    const accessToken = header.slice(7).trim();

    try {
      const { token, profile, platformRoles } = await this.authContext.authenticate(accessToken);
      req.accessToken = accessToken;
      req.auth_user_id = token.sub;
      req.user = {
        id: token.sub,
        email: profile.email ?? undefined,
        roles: token.roles,
        permissions: token.permissions,
      };
      req.platformRoles = platformRoles;
      req.userProfile = profile;
      next();
    } catch (error) {
      if (error instanceof HttpException) return next(error);
      this.logger.error('Auth middleware error', error instanceof Error ? error.stack : error);
      next(new UnauthorizedException({ error: 'Authentication service error', code: 'AUTH_SERVICE_ERROR' }));
    }
  }
}
