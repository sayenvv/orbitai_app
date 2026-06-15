/** Central route paths for the chat app — use instead of hardcoded strings. */
export const routes = {
  home: "/",
  code: "/code",
  codeSettings: "/code/settings",
  plans: "/plans",
  /** Unified Plan → Design → Development workflow home */
  studio: "/studio",
  /** @deprecated Use routes.studio with phase=plan */
  plan: "/plan",
  /** @deprecated Use routes.studio with phase=development */
  platform: "/platform",
  apps: {
    store: "/apps",
    detail: (id: string) => `/apps/${encodeURIComponent(id)}`,
    workspace: (id: string) => `/apps/${encodeURIComponent(id)}/workspace`,
    help: (id: string) => `/apps/${encodeURIComponent(id)}/help`,
  },
  chat: {
    root: "/c",
    conversation: (conversationId: string) => `/c/${encodeURIComponent(conversationId)}`,
  },
} as const;

export type HomeSection = "library" | "apps";

export type StudioPhase = "plan" | "design" | "development";

const STUDIO_PHASES: StudioPhase[] = ["plan", "design", "development"];

export function studioWithPhase(phase: StudioPhase = "plan"): string {
  return phase === "plan" ? routes.studio : `${routes.studio}?phase=${phase}`;
}

export function parseStudioPhase(value: string | null | undefined): StudioPhase {
  if (value && STUDIO_PHASES.includes(value as StudioPhase)) {
    return value as StudioPhase;
  }
  return "plan";
}

export function isStudioPath(pathname: string): boolean {
  return (
    pathname === routes.studio ||
    pathname.startsWith(`${routes.studio}/`) ||
    pathname === routes.plan ||
    pathname.startsWith(`${routes.plan}/`) ||
    pathname === routes.platform ||
    pathname.startsWith(`${routes.platform}/`)
  );
}

export function homeWithSection(section: HomeSection): string {
  return `/?section=${section}`;
}

export function isChatPath(pathname: string): boolean {
  return pathname === routes.chat.root || pathname.startsWith(`${routes.chat.root}/`);
}

export function parseConversationIdFromPath(pathname: string): string | null {
  const prefix = `${routes.chat.root}/`;
  if (!pathname.startsWith(prefix)) return null;
  const id = pathname.slice(prefix.length).split("/")[0];
  return id ? decodeURIComponent(id) : null;
}

/** Paths allowed for post-login redirects (keep in sync with proxy protected routes). */
export const ALLOWED_INTERNAL_REDIRECT_PREFIXES = [
  routes.home,
  routes.code,
  routes.codeSettings,
  routes.plans,
  routes.studio,
  routes.plan,
  routes.platform,
  routes.apps.store,
  routes.chat.root,
  "/apps/",
  "/c/",
] as const;
