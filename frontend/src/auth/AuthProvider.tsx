import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, meApi, type LoginInput } from '../api/api';
import { refreshAccessToken, session } from '../api/http';
import type { Me, Permission } from '../api/types';
import { setLanguage } from '../i18n';

type Status = 'loading' | 'anonymous' | 'authenticated';

interface AuthValue {
  status: Status;
  me?: Me;
  /** Set when the session ended on its own (expired refresh token), for a one-time notice. */
  sessionEnded: boolean;
  login: (input: LoginInput) => Promise<Me>;
  logout: () => Promise<void>;
  reloadMe: () => Promise<Me | undefined>;
  can: (...perms: Permission[]) => boolean;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me>();
  const [sessionEnded, setSessionEnded] = useState(false);

  const applyMe = useCallback((profile: Me) => {
    setMe(profile);
    setStatus('authenticated');
    if (profile.preferredLanguage === 'bn' || profile.preferredLanguage === 'en') setLanguage(profile.preferredLanguage);
    return profile;
  }, []);

  const reloadMe = useCallback(async () => {
    try {
      return applyMe(await meApi.me());
    } catch {
      return undefined;
    }
  }, [applyMe]);

  // Restore a session after a reload: the refresh token is in sessionStorage, the access token is not.
  useEffect(() => {
    session.onEnded(() => {
      setMe(undefined);
      setStatus('anonymous');
      setSessionEnded(true);
      queryClient.clear();
    });
    let cancelled = false;
    (async () => {
      if (!session.refreshToken) return setStatus('anonymous');
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (!token) return setStatus('anonymous');
      try {
        const profile = await meApi.me();
        if (!cancelled) applyMe(profile);
      } catch {
        if (!cancelled) setStatus('anonymous');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMe, queryClient]);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await authApi.login(input);
      session.set(res.tokens);
      setSessionEnded(false);
      try {
        return applyMe(await meApi.me());
      } catch (e) {
        session.clear();
        throw e;
      }
    },
    [applyMe],
  );

  const logout = useCallback(async () => {
    const refreshToken = session.refreshToken;
    try {
      if (session.accessToken) await authApi.logout(refreshToken);
    } catch {
      /* the session is dropped locally either way */
    }
    session.clear();
    setMe(undefined);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      me,
      sessionEnded,
      login,
      logout,
      reloadMe,
      can: (...perms) => Boolean(me && perms.some((p) => me.permissions.includes(p))),
    }),
    [status, me, sessionEnded, login, logout, reloadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Where a user lands after login: staff to the console, drivers to their status page, everyone else to booking. */
export const homeFor = (me?: Me) =>
  me?.isStaff ? '/console' : me?.platformRoles.includes('driver') ? '/driver' : '/book';
