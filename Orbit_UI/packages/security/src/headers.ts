export type SecurityHeaderOptions = {
  isProd: boolean;
  extraImgSrc?: string[];
};

export const SESSION_COOKIE_NAMES = {
  chat: "orbit_chat_session",
  admin: "orbit_admin_session",
  control: "orbit_control_session",
} as const;

export type SessionCookieRealm = keyof typeof SESSION_COOKIE_NAMES;

export function buildContentSecurityPolicy(options: SecurityHeaderOptions): string {
  const imgSrc = ["'self'", "data:", "blob:", ...(options.extraImgSrc ?? ["https://images.unsplash.com"])];
  const directives = [
    "default-src 'self'",
    options.isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (options.isProd) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function buildSecurityHeaders(options: SecurityHeaderOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy": buildContentSecurityPolicy(options),
  };

  if (options.isProd) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

export function applySecurityHeaders(
  response: Response,
  options: SecurityHeaderOptions,
): Response {
  const headers = buildSecurityHeaders(options);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
