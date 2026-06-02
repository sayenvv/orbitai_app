import { createSecurityProxy } from "@orbit/security";

export const proxy = createSecurityProxy({
  extraImgSrc: ["https://images.unsplash.com"],
});

/** Must be inlined — Next.js requires a static matcher at compile time. */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
