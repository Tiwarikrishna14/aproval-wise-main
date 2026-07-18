import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  authService,
  type AuthSession,
  type AuthUser,
  type LoginCredentials,
} from "@/services/auth.service";

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    authService
      .getSession()
      .then((currentSession) => {
        if (active) setSession(currentSession);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isReady,
      isAuthenticated: Boolean(session?.user),
      login: async (credentials) => {
        const nextSession = await authService.login(credentials);
        setSession(nextSession);
      },
      logout: async () => {
        await authService.logout();
        setSession(null);
      },
    }),
    [isReady, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
