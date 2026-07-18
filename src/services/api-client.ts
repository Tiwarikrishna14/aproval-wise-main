const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

function buildApiUrl(path: string) {
  if (!API_BASE_URL) return path;

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

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
