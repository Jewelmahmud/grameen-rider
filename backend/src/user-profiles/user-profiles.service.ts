import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { GilabClient } from '../auth/gilab.client';
import {
  PlatformRole,
  StoredGilabRole,
  toStoredGilabRoles,
} from '../common/auth/platform-roles';

/** The `user` object GiLab returns from login / registration / `GET /oauth/me`. */
export interface GilabUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isStaff?: boolean;
  /** Only present on login responses. */
  isEmployee?: boolean;
  designation?: string | null;
  roles?: unknown[];
}

/** Role details are re-read from GiLab at most this often (role changes apply within 15 minutes). */
export const GILAB_ROLES_MAX_AGE_MS = 15 * 60 * 1000;
const LAST_ACTIVE_WRITE_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class UserProfilesService {
  private readonly logger = new Logger(UserProfilesService.name);

  constructor(
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private readonly gilab: GilabClient,
  ) {}

  /**
   * Finds the profile for a GiLab user, creating it on first sight. When no user data is given
   * (a token we haven't seen through our login proxy), the profile is filled from `GET /oauth/me`.
   */
  async getOrCreateUserProfile(
    authUserId: string,
    userData?: GilabUser | null,
    accessToken?: string,
  ): Promise<UserProfile> {
    let profile = await this.userProfileRepository.findOne({ where: { authUserId } });

    if (!profile) {
      if (!userData && accessToken) userData = await this.fetchMe(accessToken);
      profile = this.userProfileRepository.create({
        authUserId,
        phoneNumber: null,
        userType: 'passenger',
        platformRoles: ['customer'],
      });
      this.applyIdentity(profile, userData);
      if (userData?.roles) this.applyRoles(profile, userData.roles);
      await this.ensurePhoneIsFree(profile);
      return this.userProfileRepository.save(profile);
    }

    let dirty = false;
    if (userData) {
      this.applyIdentity(profile, userData);
      if (userData.roles) this.applyRoles(profile, userData.roles);
      await this.ensurePhoneIsFree(profile);
      dirty = true;
    }
    if (!profile.lastActiveAt || Date.now() - profile.lastActiveAt.getTime() > LAST_ACTIVE_WRITE_INTERVAL_MS) {
      profile.lastActiveAt = new Date();
      dirty = true;
    }
    return dirty ? this.userProfileRepository.save(profile) : profile;
  }

  /**
   * Stores what a successful GiLab login or registration returned, including the employee fields
   * that only login responses carry. Registration responses wrap the user in `data`.
   */
  async syncUserProfileFromAuthResponse(authResponse: any): Promise<UserProfile> {
    const user: GilabUser | undefined = authResponse?.user ?? authResponse?.data;
    if (!user?.id) throw new Error('Invalid auth response: missing user data');

    const profile = await this.getOrCreateUserProfile(user.id, user);
    if (typeof user.isEmployee === 'boolean') {
      profile.isEmployee = user.isEmployee;
      profile.designation = user.isEmployee ? user.designation ?? null : null;
      profile.employeeSyncedAt = new Date();
      return this.userProfileRepository.save(profile);
    }
    return profile;
  }

  /** Re-reads role details from GiLab when they are older than 15 minutes. Keeps the old copy if GiLab fails. */
  async ensureFreshGilabRoles(profile: UserProfile, accessToken: string): Promise<StoredGilabRole[] | null> {
    const age = profile.gilabRolesSyncedAt ? Date.now() - profile.gilabRolesSyncedAt.getTime() : Infinity;
    if (profile.gilabRoles && age < GILAB_ROLES_MAX_AGE_MS) return profile.gilabRoles;

    const me = await this.fetchMe(accessToken);
    if (!me?.roles) return profile.gilabRoles;
    this.applyRoles(profile, me.roles);
    await this.userProfileRepository.update(profile.id, {
      gilabRoles: profile.gilabRoles,
      gilabRolesSyncedAt: profile.gilabRolesSyncedAt,
    });
    return profile.gilabRoles;
  }

  async recordPlatformRoles(profile: UserProfile, roles: PlatformRole[]): Promise<void> {
    const current = [...(profile.platformRoles ?? [])].sort().join(',');
    if (current === [...roles].sort().join(',')) return;
    profile.platformRoles = roles;
    await this.userProfileRepository.update(profile.id, { platformRoles: roles });
  }

  async findByAuthUserId(authUserId: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({ where: { authUserId } });
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({ where: { id } });
  }

  async updateFcmToken(authUserId: string, fcmToken: string): Promise<void> {
    await this.userProfileRepository.update({ authUserId }, { fcmToken, updatedAt: new Date() });
  }

  async updateLanguage(profileId: string, languagePreference: 'bn' | 'en'): Promise<void> {
    await this.userProfileRepository.update(profileId, { languagePreference });
  }

  private applyIdentity(profile: UserProfile, user?: GilabUser | null) {
    if (!user) return;
    if (user.email) profile.email = user.email;
    if (user.phone) profile.phoneNumber = user.phone;
    if (user.firstName) profile.firstName = user.firstName;
    if (user.lastName) profile.lastName = user.lastName;
    if (user.avatar) profile.profileImageUrl = user.avatar;
    if (typeof user.emailVerified === 'boolean') profile.emailVerified = user.emailVerified;
    if (typeof user.phoneVerified === 'boolean') profile.phoneVerified = user.phoneVerified;
    if (typeof user.isStaff === 'boolean') profile.isStaff = user.isStaff;
  }

  private applyRoles(profile: UserProfile, roles: unknown[]) {
    profile.gilabRoles = toStoredGilabRoles(roles);
    profile.gilabRolesSyncedAt = new Date();
  }

  /** phone_number is unique; never let a stale profile's number block a sync. */
  private async ensurePhoneIsFree(profile: UserProfile) {
    if (!profile.phoneNumber) return;
    const holder = await this.userProfileRepository.findOne({
      where: { phoneNumber: profile.phoneNumber, ...(profile.id ? { id: Not(profile.id) } : {}) },
    });
    if (holder) {
      this.logger.warn(`Phone already on profile ${holder.id}; not copying it to auth user ${profile.authUserId}`);
      profile.phoneNumber = profile.id ? (await this.findById(profile.id))?.phoneNumber ?? null : null;
    }
  }

  private async fetchMe(accessToken: string): Promise<GilabUser | null> {
    try {
      const response = await this.gilab.call<{ success: boolean; data: GilabUser }>('me', { bearer: accessToken });
      return response?.data ?? null;
    } catch (error) {
      this.logger.warn(`GiLab /oauth/me failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }
}
