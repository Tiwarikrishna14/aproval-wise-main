export const SESSION_COOKIE_NAME = "stockflow_session";

export function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
}

export function getSessionToken(request: Request) {
  return getCookie(request, SESSION_COOKIE_NAME);
}

export function createSessionCookie(token: string, request: Request) {
  const isHttps = new URL(request.url).protocol === "https:";
  const secure = isHttps ? "; Secure" : "";

  return (
    [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      "HttpOnly",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=86400",
    ].join("; ") + secure
  );
}

export function clearSessionCookie(request: Request) {
  const isHttps = new URL(request.url).protocol === "https:";
  const secure = isHttps ? "; Secure" : "";

  return (
    [`${SESSION_COOKIE_NAME}=`, "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"].join("; ") +
    secure
  );
}
