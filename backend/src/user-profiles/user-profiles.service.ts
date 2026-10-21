import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface AuthServerUser {
  id: string; // UUID
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
}

@Injectable()
export class UserProfilesService {
  constructor(
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @Inject(ConfigService) private configService: ConfigService,
  ) {}

  async getOrCreateUserProfile(
    authUserId: string,
    userData?: AuthServerUser,
  ): Promise<UserProfile> {
    // Check if profile exists
    let profile = await this.userProfileRepository.findOne({
      where: { authUserId },
    });

    if (!profile) {
      // Fetch user data from Auth Server if not provided
      if (!userData) {
        userData = await this.fetchUserFromAuthServer(authUserId);
      }

      // Create new profile
      profile = this.userProfileRepository.create({
        authUserId,
        phoneNumber: userData?.phone || '',
        email: userData?.email || null,
        firstName: userData?.firstName || null,
        lastName: userData?.lastName || null,
        emailVerified: userData?.emailVerified || false,
        phoneVerified: userData?.phoneVerified || false,
        userType: 'passenger',
      });

      profile = await this.userProfileRepository.save(profile);
    } else {
      // Update last_active_at
      profile.lastActiveAt = new Date();
      await this.userProfileRepository.save(profile);

      // Sync profile data if user data provided
      if (userData && (userData.email || userData.phone || userData.firstName || userData.lastName)) {
        profile.email = userData.email || profile.email;
        profile.phoneNumber = userData.phone || profile.phoneNumber;
        profile.firstName = userData.firstName || profile.firstName;
        profile.lastName = userData.lastName || profile.lastName;
        profile.emailVerified = userData.emailVerified ?? profile.emailVerified;
        profile.phoneVerified = userData.phoneVerified ?? profile.phoneVerified;
        await this.userProfileRepository.save(profile);
      }
    }

    return profile;
  }

  async syncUserProfileFromAuthResponse(authResponse: any): Promise<UserProfile> {
    const user = authResponse.user;
    if (!user || !user.id) {
      throw new Error('Invalid auth response: missing user data');
    }

    return this.getOrCreateUserProfile(user.id, user);
  }

  private async fetchUserFromAuthServer(authUserId: string): Promise<AuthServerUser | null> {
    const authServerUrl = this.configService.get('AUTH_SERVER_URL');
    const getUserEndpoint = this.configService.get('AUTH_SERVER_GET_USER_ENDPOINT');

    if (!authServerUrl || !getUserEndpoint) {
      return null;
    }

    try {
      const response = await axios.get(`${authServerUrl}${getUserEndpoint}/${authUserId}`, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user from Auth Server:', error);
      return null;
    }
  }

  async findByAuthUserId(authUserId: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({
      where: { authUserId },
    });
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({
      where: { id },
    });
  }

  async updateFcmToken(authUserId: string, fcmToken: string): Promise<void> {
    await this.userProfileRepository.update(
      { authUserId },
      { fcmToken, updatedAt: new Date() },
    );
  }
}

