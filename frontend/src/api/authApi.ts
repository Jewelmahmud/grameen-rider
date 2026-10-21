import { http } from './http';
import type { AuthResponse } from '../types';

interface LoginPayload {
  phone?: string;
  email?: string;
  password: string;
  mfaCode?: string;
}

interface RegisterPayload {
  roleName: 'grameen_ride_driver' | 'customer';
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export const authApi = {
  async login(payload: LoginPayload) {
    const { data } = await http.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterPayload) {
    const { data } = await http.post('/auth/register', payload);
    return data;
  },
};
