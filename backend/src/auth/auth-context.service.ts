import { ForbiddenException, Injectable } from '@nestjs/common';
import { TokenVerificationService, VerifiedToken } from './token-verification.service';
import { UserProfilesService } from '../user-profiles/user-profiles.service';
import { UserProfile } from '../entities/user-profile.entity';
import {
  needsGlobalCheck,
  PlatformRole,
  resolvePlatformRoles,
} from '../common/auth/platform-roles';

export interface AuthContext {
  token: VerifiedToken;
  profile: UserProfile;
  platformRoles: PlatformRole[];
}

/** One place that turns a bearer token into who-is-calling, for HTTP and Socket.IO alike. */
@Injectable()
export class AuthContextService {
  constructor(
    private readonly tokens: TokenVerificationService,
    private readonly profiles: UserProfilesService,
  ) {}

  async authenticate(accessToken: string): Promise<AuthContext> {
    const token = await this.tokens.verify(accessToken);
    const profile = await this.profiles.getOrCreateUserProfile(token.sub, null, accessToken);

    if (profile.status === 'blocked') {
      throw new ForbiddenException({
        error: 'Account blocked',
        code: 'ACCOUNT_BLOCKED',
        message: profile.blockedReason || 'This account has been blocked',
      });
    }

    // Tokens list role names only. Whether `admin` is GiLab-wide comes from the role details.
    const gilabRoles = needsGlobalCheck(token.roles)
      ? await this.profiles.ensureFreshGilabRoles(profile, accessToken)
      : profile.gilabRoles;

    const platformRoles = resolvePlatformRoles(token.roles, gilabRoles);
    await this.profiles.recordPlatformRoles(profile, platformRoles);

    return { token, profile, platformRoles };
  }
}
