import { NextResponse, type NextRequest } from "next/server";
import {
  applySecurityHeaders,
  SESSION_COOKIE_NAMES,
  type SessionCookieRealm,
} from "./headers";
import { sanitizeInternalRedirect } from "./redirect";

export type CreateSecurityMiddlewareOptions = {
  realm?: SessionCookieRealm;
  /** Paths that require a session cookie (exact or prefix match). */
  protectedPaths?: string[];
  /** Where to redirect when a protected path has no session cookie. */
  loginPath?: string;
  extraImgSrc?: string[];
};

/**
 * Use this pattern inline in each app's middleware.ts `config.matcher`.
 * Next.js cannot parse imported matcher values at compile time.
 */
export const MIDDLEWARE_MATCHER_PATTERN =
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)";

function pathRequiresAuth(pathname: string, protectedPaths: string[]): boolean {
  return protectedPaths.some(
    (pattern) => pathname === pattern || pathname.startsWith(`${pattern}/`),
  );
}

export function createSecurityMiddleware(options: CreateSecurityMiddlewareOptions = {}) {
  const isProd = process.env.NODE_ENV === "production";
  const protectedPaths = options.protectedPaths ?? [];
  const loginPath = options.loginPath ?? "/";
  const sessionCookieName = options.realm ? SESSION_COOKIE_NAMES[options.realm] : null;

  return function securityMiddleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (sessionCookieName && protectedPaths.length > 0) {
      const needsAuth = pathRequiresAuth(pathname, protectedPaths);
      const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);

      if (needsAuth && !hasSession) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = loginPath;
        redirectUrl.searchParams.set("next", sanitizeInternalRedirect(pathname, loginPath));
        return applySecurityHeaders(NextResponse.redirect(redirectUrl), { isProd, extraImgSrc: options.extraImgSrc });
      }
    }

    const response = NextResponse.next();
    return applySecurityHeaders(response, { isProd, extraImgSrc: options.extraImgSrc });
  };
}
