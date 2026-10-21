import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthCircuitBreakerService } from './auth-circuit-breaker.service';
import { UserProfilesService } from '../user-profiles/user-profiles.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private authCircuitBreakerService: AuthCircuitBreakerService,
    private userProfilesService: UserProfilesService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          error: 'No token provided',
          code: 'MISSING_TOKEN',
        });
      }

      const token = authHeader.split(' ')[1];

      // Validate token with circuit breaker
      const authResult = await this.authCircuitBreakerService.validateToken(token);

      if (!authResult.valid || authResult.fromFallback) {
        const status = authResult.fromFallback
          ? ServiceUnavailableException
          : UnauthorizedException;
        throw new status({
          error: authResult.error || 'Invalid token',
          code: authResult.fromFallback ? 'AUTH_SERVICE_UNAVAILABLE' : 'INVALID_TOKEN',
        });
      }

      // Extract user data
      req.auth_user_id = authResult.user.id;
      req.user = {
        id: authResult.user.id,
        email: authResult.user.email,
        roles: authResult.user.roles || [],
        permissions: authResult.user.permissions || [],
      };

      // Get or create user profile
      const userProfile = await this.userProfilesService.getOrCreateUserProfile(
        req.auth_user_id,
        authResult.user,
      );
      req.userProfile = userProfile;

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      console.error('Auth middleware error:', error);
      throw new UnauthorizedException({
        error: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR',
      });
    }
  }
}

