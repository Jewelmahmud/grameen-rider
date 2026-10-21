import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { authApi } from '../api/authApi';
import { setAuthToken } from '../api/http';
import type { AppRole, AuthResponse, AuthUser } from '../types';

type LoginInput = {
  phone?: string;
  email?: string;
  password: string;
  mfaCode?: string;
};

type RegisterInput = {
  roleName: 'grameen_ride_driver' | 'customer';
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
};

interface AuthContextValue {
  token?: string;
  user?: AuthUser;
  isAuthenticated: boolean;
  selectedRole?: AppRole;
  availableRoles: string[];
  login: (payload: LoginInput) => Promise<AuthResponse>;
  register: (payload: RegisterInput) => Promise<unknown>;
  logout: () => void;
  setSelectedRole: (role: AppRole) => void;
}

const TOKEN_KEY = 'grameen_ride_access_token';
const USER_KEY = 'grameen_ride_user';
const ROLE_KEY = 'grameen_ride_role';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const parseStoredUser = (): AuthUser | undefined => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return undefined;
  }
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [token, setToken] = useState<string | undefined>(() => localStorage.getItem(TOKEN_KEY) || undefined);
  const [user, setUser] = useState<AuthUser | undefined>(() => parseStoredUser());
  const [selectedRole, setSelectedRoleState] = useState<AppRole | undefined>(
    () => (localStorage.getItem(ROLE_KEY) as AppRole | null) || undefined,
  );

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const availableRoles = user?.roles?.map((role) => role.name) || [];

  const login = async (payload: LoginInput) => {
    const data = await authApi.login(payload);
    const accessToken = data.tokens?.accessToken;

    if (accessToken) {
      setToken(accessToken);
      setAuthToken(accessToken);
      localStorage.setItem(TOKEN_KEY, accessToken);
    }

    setUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    const firstRole = (data.user.roles[0]?.name as AppRole | undefined) || undefined;
    if (firstRole) {
      setSelectedRoleState(firstRole);
      localStorage.setItem(ROLE_KEY, firstRole);
    }

    return data;
  };

  const register = async (payload: RegisterInput) => authApi.register(payload);

  const logout = () => {
    setToken(undefined);
    setUser(undefined);
    setSelectedRoleState(undefined);
    setAuthToken(undefined);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  };

  const setSelectedRole = (role: AppRole) => {
    setSelectedRoleState(role);
    localStorage.setItem(ROLE_KEY, role);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      selectedRole,
      availableRoles,
      login,
      register,
      logout,
      setSelectedRole,
    }),
    [token, user, selectedRole, availableRoles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
