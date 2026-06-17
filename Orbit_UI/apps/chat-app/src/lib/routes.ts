import type { PlanGenerateTarget } from "@/lib/plan-catalog";

/** Central route paths for the chat app — use instead of hardcoded strings. */
export const routes = {
  home: "/",
  code: "/code",
  codeSettings: "/code/settings",
  plans: "/plans",
  agents: "/agents",
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

export function studioPlanWorkspace(
  planId: string,
  phase: StudioPhase = "plan",
  sectionId?: string | null,
  target?: PlanGenerateTarget | null,
): string {
  const params = new URLSearchParams();
  if (phase !== "plan") params.set("phase", phase);
  params.set("planId", planId);
  const section = sectionId?.trim();
  if (section) params.set("section", section);
  if (target === "documentation") params.set("target", target);
  return `${routes.studio}?${params.toString()}`;
}

export function parseStudioPlanTarget(
  value: string | null | undefined,
): PlanGenerateTarget | null {
  if (value === "synopsis" || value === "documentation") return value;
  return null;
}

/** Update the URL without a Next.js navigation cycle (avoids layout flicker). */
export function replaceBrowserUrl(path: string): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", path);
}

export function readBrowserSearchParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function studioPlanShareUrl(
  planId: string,
  options?: {
    phase?: StudioPhase;
    sectionId?: string | null;
    target?: PlanGenerateTarget | null;
    origin?: string;
  },
): string {
  const phase = options?.phase ?? "plan";
  const path = studioPlanWorkspace(planId, phase, options?.sectionId, options?.target);
  const origin =
    options?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}${path}`;
}

export function parseStudioPlanSectionId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseStudioPlanId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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

export function isAgentsPath(pathname: string): boolean {
  return pathname === routes.agents || pathname.startsWith(`${routes.agents}/`);
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
  routes.agents,
  routes.studio,
  routes.plan,
  routes.platform,
  routes.apps.store,
  routes.chat.root,
  "/apps/",
  "/c/",
] as const;
