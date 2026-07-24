import type { Role } from "@/lib/role-context";

import {
  apiGet,
  apiPost,
  clearStoredAccessToken,
  getStoredAccessToken,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  setStoredAccessToken,
} from "./api-client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
  organizationId?: string;
  roles?: string[];
  permissions?: string[];
};

export type AuthSession = {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

type BackendUser = {
  id?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  organizationId?: unknown;
  roles?: unknown;
  permissions?: unknown;
};

type BackendAuthData = {
  accessToken?: unknown;
  refreshToken?: unknown;
  tokenType?: unknown;
  expiresIn?: unknown;
  user?: unknown;
};

type BackendEnvelope = {
  success?: unknown;
  message?: unknown;
  data?: unknown;
  user?: unknown;
};

const AUTH_USER_COOKIE_NAME = "stockflow_auth_user";
const REFRESH_TOKEN_COOKIE_NAME = "stockflow_refresh_token";
const EXPIRES_AT_COOKIE_NAME = "stockflow_expires_at";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function initialsFromName(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

function roleFromBackend(roles: string[], permissions: string[]): Role {
  if (roles.some((role) => role.includes("ADMIN")) || permissions.includes("USER_VIEW")) {
    return "admin";
  }

  if (roles.some((role) => role.includes("APPROVER")) || permissions.includes("ORDER_APPROVE")) {
    return "approver";
  }

  if (roles.some((role) => role.includes("VERIFIER")) || permissions.includes("INVENTORY_UPDATE")) {
    return "verifier";
  }

  return "customer";
}

function normalizeUser(user: BackendUser): AuthUser {
  const email = typeof user.email === "string" ? user.email : "";
  const firstName = typeof user.firstName === "string" ? user.firstName : "";
  const lastName = typeof user.lastName === "string" ? user.lastName : "";
  const providedName = typeof user.name === "string" ? user.name : "";
  const name = providedName || `${firstName} ${lastName}`.trim() || email || "User";
  const roles = isStringArray(user.roles) ? user.roles : [];
  const permissions = isStringArray(user.permissions) ? user.permissions : [];
  const existingRole =
    user.role === "customer" ||
    user.role === "admin" ||
    user.role === "approver" ||
    user.role === "verifier"
      ? user.role
      : undefined;

  return {
    id: typeof user.id === "string" ? user.id : email || "user",
    name,
    email,
    initials: initialsFromName(name),
    role: existingRole ?? roleFromBackend(roles, permissions),
    organizationId: typeof user.organizationId === "string" ? user.organizationId : undefined,
    roles,
    permissions,
  };
}

function normalizeAuthSession(payload: unknown, fallback?: AuthSession | null): AuthSession {
  const envelope = (payload ?? {}) as BackendEnvelope;
  const dataValue = envelope.data ?? envelope;
  const data = dataValue as BackendAuthData;
  const dataAsUser = dataValue as BackendUser;
  const userPayload = (data.user ??
    envelope.user ??
    (typeof dataAsUser.email === "string" ? dataAsUser : undefined)) as BackendUser | undefined;

  if (!userPayload) {
    throw new Error(
      typeof envelope.message === "string"
        ? envelope.message
        : "Login response did not include user data.",
    );
  }

  const expiresIn = typeof data.expiresIn === "number" ? data.expiresIn : undefined;
  const accessToken =
    typeof data.accessToken === "string" ? data.accessToken : fallback?.accessToken;

  return {
    user: normalizeUser(userPayload),
    accessToken,
    refreshToken:
      typeof data.refreshToken === "string" ? data.refreshToken : fallback?.refreshToken,
    tokenType: typeof data.tokenType === "string" ? data.tokenType : fallback?.tokenType,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : fallback?.expiresAt,
  };
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
}

function secureCookieAttribute() {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  if (typeof document === "undefined") return;

  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
    maxAgeSeconds ? `Max-Age=${maxAgeSeconds}` : undefined,
  ]
    .filter(Boolean)
    .join("; ")
    .concat(secureCookieAttribute());
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; Path=/; SameSite=Lax; Max-Age=0${secureCookieAttribute()}`;
}

function compactUser(user: AuthUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: user.initials,
    role: user.role,
    organizationId: user.organizationId,
    roles: user.roles,
    permissions: user.permissions,
  };
}

function getStoredSession() {
  const rawUser = getCookie(AUTH_USER_COOKIE_NAME);
  if (!rawUser) return null;

  try {
    const expiresAtValue = getCookie(EXPIRES_AT_COOKIE_NAME);
    const expiresAt = expiresAtValue ? Number(expiresAtValue) : undefined;

    const refreshToken = getCookie(REFRESH_TOKEN_COOKIE_NAME) ?? undefined;
    const accessToken = getStoredAccessToken() ?? undefined;

    if (expiresAt && expiresAt <= Date.now() && !refreshToken && !accessToken) {
      clearStoredSession();
      return null;
    }

    return {
      user: JSON.parse(rawUser) as AuthUser,
      accessToken,
      refreshToken,
      expiresAt,
    } satisfies AuthSession;
  } catch {
    clearStoredSession();
    return null;
  }
}

function getStoredRefreshToken() {
  return getCookie(REFRESH_TOKEN_COOKIE_NAME);
}

function storeSession(session: AuthSession) {
  const accessMaxAgeSeconds = session.expiresAt
    ? Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000))
    : undefined;
  const sessionMaxAgeSeconds = session.refreshToken
    ? REFRESH_TOKEN_MAX_AGE_SECONDS
    : accessMaxAgeSeconds;

  setCookie(AUTH_USER_COOKIE_NAME, JSON.stringify(compactUser(session.user)), sessionMaxAgeSeconds);

  if (session.refreshToken) {
    setCookie(REFRESH_TOKEN_COOKIE_NAME, session.refreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS);
  }

  if (session.expiresAt) {
    setCookie(EXPIRES_AT_COOKIE_NAME, String(session.expiresAt), sessionMaxAgeSeconds);
  }

  if (session.accessToken) {
    setStoredAccessToken(session.accessToken, accessMaxAgeSeconds);
  }
}

function clearStoredSession() {
  deleteCookie(AUTH_USER_COOKIE_NAME);
  deleteCookie(REFRESH_TOKEN_COOKIE_NAME);
  deleteCookie(EXPIRES_AT_COOKIE_NAME);
  clearStoredAccessToken();
}

export const authService = {
  async getSession(): Promise<AuthSession | null> {
    const storedSession = getStoredSession();

    try {
      const session = normalizeAuthSession(await apiGet<unknown>("/api/auth/me"), storedSession);
      storeSession(session);
      return session;
    } catch {
      return getStoredSession();
    }
  },

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const email = credentials.email.trim();
    const password = credentials.password.trim();

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const session = normalizeAuthSession(
      await apiPost<unknown, LoginCredentials>("/api/auth/login", { email, password }),
    );
    storeSession(session);
    return session;
  },

  async logout() {
    try {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await apiPost<void, { refreshToken: string }>("/api/auth/logout", { refreshToken });
      }
    } finally {
      clearStoredSession();
    }
  },
};
