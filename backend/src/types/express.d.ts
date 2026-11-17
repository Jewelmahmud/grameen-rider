import { UserProfile } from '../entities/user-profile.entity';
import { PlatformRole } from '../common/auth/platform-roles';

declare global {
  namespace Express {
    interface Request {
      auth_user_id?: string; // UUID from Auth Server
      user?: {
        id: string;
        email?: string;
        roles?: string[];
        permissions?: string[];
      };
      /** Grameen Ride roles resolved from the verified GiLab token. */
      platformRoles?: PlatformRole[];
      /** Raw bearer token, needed to call GiLab on the user's behalf (logout). */
      accessToken?: string;
      userProfile?: UserProfile; // Database user profile
    }
  }
}
