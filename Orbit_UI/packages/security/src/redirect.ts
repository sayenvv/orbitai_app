const ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/users",
  "/conversations",
  "/subscriptions",
  "/payments",
  "/settings",
  "/reports",
  "/logs",
  "/notifications",
  "/activity",
  "/user-health",
  "/access",
  "/profile",
  "/apps",
  "/c",
  "/plans",
  "/agents",
  "/configuration",
  "/themes",
  "/tools",
  "/widgets",
  "/personalization",
  "/adaptive-cards",
  "/integrations",
  "/plan-limits",
] as const;

/** Prevent open redirects — only allow known in-app paths. */
export function sanitizeInternalRedirect(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  const normalized = path.split("?")[0]?.split("#")[0] ?? path;
  const allowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );

  return allowed ? path : fallback;
}
