import { createSecurityMiddleware } from "@orbit/security";

export const middleware = createSecurityMiddleware({
  realm: "control",
  protectedPaths: ["/agents", "/configuration", "/themes", "/tools", "/widgets", "/personalization", "/adaptive-cards", "/integrations", "/plan-limits", "/access"],
  loginPath: "/",
});

/** Must be inlined — Next.js requires a static matcher at compile time. */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
