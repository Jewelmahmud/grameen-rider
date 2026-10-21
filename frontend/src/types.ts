export type AppRole =
  | 'admin'
  | 'super_admin'
  | 'grameen_ride_branch_admin'
  | 'grameen_ride_operations'
  | 'grameen_ride_admin'
  | 'customer'
  | 'grameen_ride_driver';

export interface RoleInfo {
  id?: number;
  name: string;
  description?: string;
  permissions?: string[];
}

export interface AuthUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: RoleInfo[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user: AuthUser;
  tokens: AuthTokens;
}
