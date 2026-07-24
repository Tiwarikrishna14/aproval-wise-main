const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
const ACCESS_TOKEN_COOKIE_NAME = "stockflow_access_token";
const AUTH_USER_COOKIE_NAME = "stockflow_auth_user";
const REFRESH_TOKEN_COOKIE_NAME = "stockflow_refresh_token";
const EXPIRES_AT_COOKIE_NAME = "stockflow_expires_at";
const DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;

export const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type BackendAuthData = {
  accessToken?: unknown;
  refreshToken?: unknown;
  expiresIn?: unknown;
};

type BackendEnvelope = {
  data?: unknown;
  message?: unknown;
};

let refreshPromise: Promise<boolean> | null = null;

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

export function getStoredAccessToken() {
  return getCookie(ACCESS_TOKEN_COOKIE_NAME);
}

export function getStoredRefreshToken() {
  return getCookie(REFRESH_TOKEN_COOKIE_NAME);
}

export function setStoredAccessToken(token: string, maxAgeSeconds?: number) {
  setCookie(ACCESS_TOKEN_COOKIE_NAME, token, maxAgeSeconds);
}

export function setStoredRefreshToken(
  token: string,
  maxAgeSeconds = REFRESH_TOKEN_MAX_AGE_SECONDS,
) {
  setCookie(REFRESH_TOKEN_COOKIE_NAME, token, maxAgeSeconds);
}

export function setStoredAccessExpiresAt(
  expiresAt: number,
  maxAgeSeconds = REFRESH_TOKEN_MAX_AGE_SECONDS,
) {
  setCookie(EXPIRES_AT_COOKIE_NAME, String(expiresAt), maxAgeSeconds);
}

export function clearStoredAccessToken() {
  deleteCookie(ACCESS_TOKEN_COOKIE_NAME);
}

export function clearStoredAuthCookies() {
  deleteCookie(ACCESS_TOKEN_COOKIE_NAME);
  deleteCookie(AUTH_USER_COOKIE_NAME);
  deleteCookie(REFRESH_TOKEN_COOKIE_NAME);
  deleteCookie(EXPIRES_AT_COOKIE_NAME);
}

function normalizeApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return normalizedPath.startsWith("/api/v1/")
    ? normalizedPath
    : normalizedPath.startsWith("/api/")
      ? `/api/v1/${normalizedPath.slice("/api/".length)}`
      : normalizedPath;
}

function buildApiUrl(path: string) {
  const backendPath = normalizeApiPath(path);

  if (!API_BASE_URL) return backendPath;

  return `${API_BASE_URL}${backendPath}`;
}

function shouldSkipRefresh(path: string) {
  const backendPath = normalizeApiPath(path);

  return (
    backendPath === "/api/v1/auth/login" ||
    backendPath === "/api/v1/auth/refresh" ||
    backendPath === "/api/v1/auth/logout"
  );
}

function unwrapAuthData(payload: unknown): BackendAuthData {
  const envelope = (payload ?? {}) as BackendEnvelope;
  return (envelope.data ?? envelope) as BackendAuthData;
}

function extendStoredUserCookie(maxAgeSeconds = REFRESH_TOKEN_MAX_AGE_SECONDS) {
  const storedUser = getCookie(AUTH_USER_COOKIE_NAME);
  if (storedUser) setCookie(AUTH_USER_COOKIE_NAME, storedUser, maxAgeSeconds);
}

function clearAndNotifyAuthState() {
  clearStoredAuthCookies();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("stockflow-auth-cleared"));
  }
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(buildApiUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAndNotifyAuthState();
        return false;
      }

      const data = unwrapAuthData(await response.json());
      const accessToken = typeof data.accessToken === "string" ? data.accessToken : "";
      const nextRefreshToken =
        typeof data.refreshToken === "string" ? data.refreshToken : refreshToken;
      const expiresIn =
        typeof data.expiresIn === "number" ? data.expiresIn : DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS;

      if (!accessToken) {
        clearAndNotifyAuthState();
        return false;
      }

      setStoredAccessToken(accessToken, expiresIn);
      setStoredRefreshToken(nextRefreshToken);
      setStoredAccessExpiresAt(Date.now() + expiresIn * 1000);
      extendStoredUserCookie();

      return true;
    } catch {
      clearAndNotifyAuthState();
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function fetchWithAuth(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const accessToken = getStoredAccessToken();

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });
}

async function apiRequest<T>(path: string, init?: RequestInit, canRefresh = true): Promise<T> {
  let response = await fetchWithAuth(path, init);

  if (response.status === 401 && canRefresh && !shouldSkipRefresh(path)) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await fetchWithAuth(path, init);
    }
  }

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;

    try {
      const payload = (await response.clone().json()) as { message?: unknown };
      if (typeof payload.message === "string") message = payload.message;
    } catch {
      // Keep the generic status message when the response is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init);
}

export async function apiPost<T, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: RequestInit,
): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: "POST",
    body: body == null ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function apiPut<T, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: RequestInit,
): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: "PUT",
    body: body == null ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: "DELETE",
  });
}
