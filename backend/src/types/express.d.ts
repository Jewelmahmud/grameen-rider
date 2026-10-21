import { UserProfile } from './user-profile';

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
      userProfile?: UserProfile; // Database user profile
    }
  }
}

