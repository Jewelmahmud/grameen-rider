import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody, LoginResponse } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:5006/api';

/**
 * Session storage: the access token lives in memory only; the refresh token in sessionStorage
 * (survives a reload, not a closed tab). GiLab does not rotate refresh tokens.
 */
const REFRESH_KEY = 'gr.refresh';
let accessToken: string | undefined;
let onSessionEnded: (() => void) | undefined;

const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(REFRESH_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set: (v?: string) => {
    try {
      if (v) sessionStorage.setItem(REFRESH_KEY, v);
      else sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      /* private mode: session ends on reload */
    }
  },
};

export const session = {
  get accessToken() {
    return accessToken;
  },
  get refreshToken() {
    return storage.get();
  },
  hasSession: () => Boolean(accessToken || storage.get()),
  set(tokens: LoginResponse['tokens']) {
    accessToken = tokens.accessToken;
    if (tokens.refreshToken) storage.set(tokens.refreshToken);
  },
  clear() {
    accessToken = undefined;
    storage.set(undefined);
  },
  onEnded(cb: () => void) {
    onSessionEnded = cb;
  },
};

export const http = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });

http.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | undefined> | null = null;

/** One refresh at a time; concurrent 401s wait for the same call. */
export function refreshAccessToken(): Promise<string | undefined> {
  const refreshToken = storage.get();
  if (!refreshToken) return Promise.resolve(undefined);
  refreshing ??= axios
    .post<LoginResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      accessToken = data.tokens?.accessToken;
      return accessToken;
    })
    .catch((e: AxiosError) => {
      // Only a definite rejection ends the session; a network blip keeps the refresh token.
      if (e.response && [400, 401, 403].includes(e.response.status)) session.clear();
      return undefined;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/otp/send', '/auth/verify-phone'];

http.interceptors.response.use(undefined, async (error: AxiosError<ApiErrorBody>) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  // ACCOUNT_BLOCKED is a 403: shown as a message by the page, never a logout loop.
  if (
    error.response?.status === 401 &&
    original &&
    !original._retried &&
    !NO_REFRESH.some((p) => original.url?.startsWith(p))
  ) {
    original._retried = true;
    const token = await refreshAccessToken();
    if (token) {
      original.headers.Authorization = `Bearer ${token}`;
      return http(original);
    }
    session.clear();
    onSessionEnded?.();
  }
  return Promise.reject(error);
});

/** The server's message (often Bangla) for an inline Alert. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Cannot reach the server. Check your connection.';
    const msg = (error.response.data as ApiErrorBody | undefined)?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (msg) return msg;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function errorCode(error: unknown): string | undefined {
  return axios.isAxiosError(error) ? (error.response?.data as ApiErrorBody | undefined)?.code : undefined;
}
