import { catalogAppIds, type CatalogAppId } from "./app-ids";

export { catalogAppIds, type CatalogAppId } from "./app-ids";

export type AppTier = "starter" | "pro";

export type AppScreenshot = {
  title: string;
  caption: string;
  gradientClass: string;
};

export type CatalogSubApp = {
  slug: string;
  name: string;
  description: string;
  modelAccess: string;
  badges: string[];
};

export type CatalogApp = {
  id: string;
  slug: string;
  version: string;
  name: string;
  iconKey:
    | "wand"
    | "camera"
    | "brush"
    | "film"
    | "mic"
    | "image"
    | "sparkles"
    | "briefcase"
    | "book"
    | "layers";
  category: string;
  tag: string;
  tier: AppTier;
  tagline: string;
  shortDescription: string;
  description: string;
  monthlyUsers: string;
  usageCount: string;
  rating: number;
  installs: string;
  modelAccess: string;
  heroGradient: string;
  featured?: boolean;
  badges: string[];
  screenshots: AppScreenshot[];
  subApps?: CatalogSubApp[];
};

export type SponsoredApp = {
  name: string;
  label: string;
  pitch: string;
  cta: string;
  gradientClass: string;
};

export const appsCatalog: CatalogApp[] = [
  {
    id: catalogAppIds.logoStudio,
    slug: "logo-studio",
    version: "0.1.0",
    name: "Logo Studio",
    iconKey: "wand",
    category: "Branding",
    tag: "Identity",
    tier: "starter",
    tagline: "Design a complete brand identity from a single prompt.",
    heroGradient: "from-violet-600 via-fuchsia-600 to-indigo-600",
    featured: true,
    shortDescription: "Generate polished logo concepts and brand marks in minutes.",
    description:
      "Logo Studio helps founders and marketing teams generate complete logo concepts with icon, typography, and color pairings. Start from a prompt, then iterate variants for social, web, and product branding.",
    monthlyUsers: "24.8k monthly users",
    usageCount: "1.3M logos generated",
    rating: 4.8,
    installs: "82k installs",
    modelAccess: "Starter model access",
    badges: ["Fast generation", "Brand presets", "SVG export"],
    screenshots: [
      {
        title: "Prompt workspace",
        caption: "Describe your brand and generate multiple concepts.",
        gradientClass: "from-violet-500/35 via-fuchsia-500/25 to-indigo-500/25",
      },
      {
        title: "Variant gallery",
        caption: "Review icon and text lockup variations side-by-side.",
        gradientClass: "from-indigo-500/35 via-sky-500/20 to-violet-500/25",
      },
      {
        title: "Export center",
        caption: "Export transparent PNG, SVG, and social-ready kits.",
        gradientClass: "from-fuchsia-500/30 via-violet-500/20 to-rose-500/25",
      },
    ],
  },
  {
    id: catalogAppIds.photoGenerator,
    slug: "photo-studio",
    version: "1.0.0",
    name: "Photo Studio",
    iconKey: "camera",
    category: "Image",
    tag: "Visuals",
    tier: "starter",
    tagline: "Logos, product shots, and campaign visuals from a single studio.",
    heroGradient: "from-sky-600 via-cyan-600 to-blue-700",
    featured: true,
    shortDescription: "Create logos, product photos, lifestyle scenes, and ad visuals from text prompts.",
    description:
      "Photo Studio covers the full creative stack — brand logos and marks, e-commerce product shots, lifestyle mockups, social assets, and campaign visuals. Use style presets and aspect controls to keep outputs consistent across channels.",
    monthlyUsers: "31.2k monthly users",
    usageCount: "2.1M images rendered",
    rating: 4.7,
    installs: "97k installs",
    modelAccess: "Starter model access",
    badges: ["Logo concepts", "Product shots", "Style lock"],
    screenshots: [
      {
        title: "Logo workspace",
        caption: "Generate brand marks, icon lockups, and logo variants from a prompt.",
        gradientClass: "from-violet-500/35 via-fuchsia-500/25 to-indigo-500/25",
      },
      {
        title: "Style presets",
        caption: "Pick cinematic, editorial, or studio lighting for any shot type.",
        gradientClass: "from-sky-500/35 via-cyan-500/20 to-blue-500/30",
      },
      {
        title: "Campaign board",
        caption: "Batch product, lifestyle, and ad-ready outputs for one brief.",
        gradientClass: "from-blue-500/35 via-indigo-500/20 to-cyan-500/25",
      },
    ],
  },
  {
    id: catalogAppIds.creativeEditor,
    slug: "creative-editor",
    version: "0.1.0",
    name: "Creative Editor",
    iconKey: "brush",
    category: "Editing",
    tag: "Studio",
    tier: "pro",
    tagline: "A pro-grade AI canvas for retouch, cleanup, and upscale.",
    heroGradient: "from-emerald-600 via-teal-600 to-cyan-700",
    featured: true,
    shortDescription: "Edit, clean, and upscale images with pro AI workflows.",
    description:
      "Creative Editor combines background removal, object cleanup, relighting, and smart upscale tools in a single canvas. Built for teams that need premium-quality visuals fast.",
    monthlyUsers: "18.6k monthly users",
    usageCount: "640k edits completed",
    rating: 4.9,
    installs: "54k installs",
    modelAccess: "Pro model access",
    badges: ["4x upscale", "Object erase", "Layer export"],
    screenshots: [
      {
        title: "Edit canvas",
        caption: "Brush-select regions and apply local AI edits.",
        gradientClass: "from-emerald-500/35 via-teal-500/20 to-lime-500/25",
      },
      {
        title: "Before / after",
        caption: "Preview retouches with instant split comparison.",
        gradientClass: "from-teal-500/35 via-emerald-500/25 to-cyan-500/20",
      },
      {
        title: "Quality pipeline",
        caption: "Apply enhancement passes and export high-res assets.",
        gradientClass: "from-lime-500/30 via-emerald-500/20 to-teal-500/25",
      },
    ],
  },
  {
    id: catalogAppIds.videoSnippets,
    slug: "video-snippets",
    version: "0.1.0",
    name: "Video Snippets",
    iconKey: "film",
    category: "Video",
    tag: "Motion",
    tier: "pro",
    tagline: "Turn a concept into a polished social reel in minutes.",
    heroGradient: "from-amber-500 via-orange-600 to-rose-600",
    shortDescription: "Turn concepts into short product reels and promos.",
    description:
      "Video Snippets generates short-form videos for launches, explainers, and social campaigns. Use script prompts, scene templates, and style controls to deliver polished clips quickly.",
    monthlyUsers: "12.1k monthly users",
    usageCount: "220k clips produced",
    rating: 4.6,
    installs: "39k installs",
    modelAccess: "Pro model access",
    badges: ["Scene templates", "Auto captions", "Reel export"],
    screenshots: [
      {
        title: "Storyboard timeline",
        caption: "Arrange scenes and transitions visually.",
        gradientClass: "from-amber-500/35 via-orange-500/25 to-rose-500/25",
      },
      {
        title: "Prompt-to-video",
        caption: "Generate clips directly from campaign concepts.",
        gradientClass: "from-orange-500/35 via-amber-500/20 to-red-500/25",
      },
      {
        title: "Social formats",
        caption: "Export in 9:16, 1:1, and 16:9 with one click.",
        gradientClass: "from-rose-500/30 via-orange-500/20 to-amber-500/25",
      },
    ],
  },
  {
    id: catalogAppIds.voiceMaker,
    slug: "voice-maker",
    version: "0.1.0",
    name: "Voice Maker",
    iconKey: "mic",
    category: "Audio",
    tag: "Voice",
    tier: "pro",
    tagline: "Studio-quality voiceovers with natural, expressive delivery.",
    heroGradient: "from-rose-600 via-pink-600 to-fuchsia-700",
    shortDescription: "Generate natural-sounding voiceovers for content and demos.",
    description:
      "Voice Maker helps teams ship narrations and voice tracks with studio-grade clarity. Choose voice personas, control pacing, and export production-ready WAV/MP3 files.",
    monthlyUsers: "9.4k monthly users",
    usageCount: "510k voice minutes generated",
    rating: 4.7,
    installs: "28k installs",
    modelAccess: "Pro model access",
    badges: ["Voice styles", "Pacing control", "Studio export"],
    screenshots: [
      {
        title: "Voice selector",
        caption: "Choose personas by tone, accent, and delivery style.",
        gradientClass: "from-rose-500/35 via-pink-500/25 to-violet-500/20",
      },
      {
        title: "Script console",
        caption: "Edit script timing and pronunciation hints.",
        gradientClass: "from-pink-500/35 via-rose-500/20 to-fuchsia-500/25",
      },
      {
        title: "Track export",
        caption: "Render files optimized for podcasts and social videos.",
        gradientClass: "from-violet-500/30 via-rose-500/20 to-pink-500/25",
      },
    ],
  },
  {
    id: catalogAppIds.assetRemix,
    slug: "asset-remix",
    version: "0.1.0",
    name: "Asset Remix",
    iconKey: "image",
    category: "Design",
    tag: "Remix",
    tier: "starter",
    tagline: "Restyle any creative into fresh on-brand directions.",
    heroGradient: "from-indigo-600 via-purple-600 to-sky-700",
    shortDescription: "Restyle existing assets into new themes and directions.",
    description:
      "Asset Remix lets you upload existing creatives and instantly generate alternate versions for campaigns, channels, and audiences while preserving core brand identity.",
    monthlyUsers: "16.9k monthly users",
    usageCount: "870k remixes created",
    rating: 4.8,
    installs: "46k installs",
    modelAccess: "Starter model access",
    badges: ["Theme transfer", "Brand lock", "Multi-size output"],
    screenshots: [
      {
        title: "Reference upload",
        caption: "Upload an original and apply curated style packs.",
        gradientClass: "from-indigo-500/35 via-purple-500/25 to-sky-500/20",
      },
      {
        title: "Style sets",
        caption: "Generate multiple directions from one input asset.",
        gradientClass: "from-purple-500/35 via-indigo-500/20 to-fuchsia-500/25",
      },
      {
        title: "Delivery presets",
        caption: "Export variants for ads, banners, and marketplace listings.",
        gradientClass: "from-sky-500/30 via-indigo-500/20 to-purple-500/25",
      },
    ],
  },
  {
    id: catalogAppIds.careerCoach,
    slug: "career-coach",
    version: "0.1.0",
    name: "Career Coach",
    iconKey: "briefcase",
    category: "Career",
    tag: "Jobs",
    tier: "starter",
    tagline: "Prepare resumes, job applications, and interviews with confidence.",
    heroGradient: "from-blue-600 via-indigo-600 to-violet-700",
    shortDescription: "AI job search prep for resumes, interviews, and role-specific practice.",
    description:
      "Career Coach helps jobseekers create tailored resumes, improve LinkedIn summaries, practice mock interviews, and prepare confident answers for specific roles. Upload a job description, generate a focused preparation plan, and rehearse behavioral or technical questions.",
    monthlyUsers: "14.3k monthly users",
    usageCount: "430k interview sessions",
    rating: 4.8,
    installs: "41k installs",
    modelAccess: "Starter model access",
    badges: ["Resume tailoring", "Mock interviews", "Role prep"],
    subApps: [
      {
        slug: "resume-builder",
        name: "Resume Builder",
        description: "Create role-specific resumes, achievements, and ATS-friendly summaries.",
        modelAccess: "Starter model access",
        badges: ["ATS keywords", "Role matching", "Summary rewrite"],
      },
      {
        slug: "mock-interview",
        name: "Mock Interview",
        description: "Practice behavioral, technical, and role-specific interview questions.",
        modelAccess: "Starter model access",
        badges: ["Live practice", "Answer feedback", "Question bank"],
      },
    ],
    screenshots: [
      {
        title: "Job match brief",
        caption: "Compare your profile against a role and identify gaps.",
        gradientClass: "from-blue-500/35 via-indigo-500/25 to-violet-500/25",
      },
      {
        title: "Interview simulator",
        caption: "Practice role-specific questions with guided feedback.",
        gradientClass: "from-indigo-500/35 via-blue-500/20 to-cyan-500/25",
      },
      {
        title: "Resume optimizer",
        caption: "Tailor achievements, keywords, and summaries for each application.",
        gradientClass: "from-violet-500/30 via-indigo-500/20 to-blue-500/25",
      },
    ],
  },
  {
    id: catalogAppIds.researchCompanion,
    slug: "research-companion",
    version: "1.0.0",
    name: "Research Companion",
    iconKey: "book",
    category: "Research",
    tag: "Research",
    tier: "pro",
    tagline: "Analyze documents, organize evidence, and build structured research notes.",
    heroGradient: "from-teal-600 via-emerald-600 to-lime-700",
    shortDescription: "Multipurpose research assistant for papers, case studies, reports, and document review.",
    description:
      "Research Companion supports case studies, academic papers, business reports, and analyst workflows. Summarize sources, extract methods and findings, compare evidence, build citation-ready notes, and turn dense material into structured insights.",
    monthlyUsers: "11.7k monthly users",
    usageCount: "360k papers reviewed",
    rating: 4.9,
    installs: "33k installs",
    modelAccess: "Pro model access",
    badges: ["Document summaries", "Evidence mapping", "Insight workspace"],
    subApps: [
      {
        slug: "paper-summarizer",
        name: "Paper Summarizer",
        description: "Summarize abstracts, methods, findings, and limitations from academic papers.",
        modelAccess: "Pro model access",
        badges: ["Methods extract", "Findings", "Limitations"],
      },
      {
        slug: "literature-review",
        name: "Literature Review",
        description: "Organize sources into a comparison matrix and identify research gaps.",
        modelAccess: "Pro model access",
        badges: ["Source matrix", "Research gaps", "Evidence notes"],
      },
    ],
    screenshots: [
      {
        title: "Paper workspace",
        caption: "Extract abstract, methods, findings, and limitations.",
        gradientClass: "from-teal-500/35 via-emerald-500/25 to-lime-500/20",
      },
      {
        title: "Literature matrix",
        caption: "Compare sources by topic, evidence strength, and research gap.",
        gradientClass: "from-emerald-500/35 via-teal-500/20 to-cyan-500/25",
      },
      {
        title: "Research notes",
        caption: "Convert source material into structured notes and discussion prompts.",
        gradientClass: "from-lime-500/30 via-emerald-500/20 to-teal-500/25",
      },
    ],
  },
  {
    id: catalogAppIds.clovaiProjects,
    slug: "clovai-projects",
    version: "1.0.0",
    name: "Clovai Projects",
    iconKey: "layers",
    category: "Planning",
    tag: "SDLC",
    tier: "pro",
    tagline: "Turn requirements into editable SDLC workspaces with diagrams and exportable docs.",
    heroGradient: "from-indigo-600 via-violet-600 to-blue-800",
    featured: true,
    shortDescription:
      "AI project planning from requirements to architecture, APIs, testing strategy, and deployment plans.",
    description:
      "Clovai Projects converts uploaded requirements or project ideas into a structured SDLC workspace. Select the sections you need, review AI-generated artifacts, edit content and diagrams, collaborate with an AI assistant, and export professional documentation.",
    monthlyUsers: "8.2k monthly users",
    usageCount: "140k SDLC sections generated",
    rating: 4.9,
    installs: "22k installs",
    modelAccess: "Pro model access",
    badges: ["SDLC workspace", "Mermaid diagrams", "Export center"],
    screenshots: [
      {
        title: "Workspace dashboard",
        caption: "Create workspaces and track review progress across SDLC artifacts.",
        gradientClass: "from-indigo-500/35 via-violet-500/25 to-blue-500/20",
      },
      {
        title: "SDLC selection",
        caption: "Choose full SDLC packages or custom module sets before generation.",
        gradientClass: "from-violet-500/35 via-indigo-500/20 to-sky-500/25",
      },
      {
        title: "Planning workspace",
        caption: "Edit requirements, diagrams, and implementation plans in one layout.",
        gradientClass: "from-blue-500/35 via-indigo-500/20 to-violet-500/25",
      },
    ],
  },
];

/** Apps kept in catalog data but hidden from store listings until implemented. */
export const hiddenAppSlugs = new Set<string>([
  "logo-studio",
  "career-coach",
  "asset-remix",
  "voice-maker",
  "video-snippets",
  "creative-editor",
]);

export function isAppVisible(app: CatalogApp): boolean {
  return !hiddenAppSlugs.has(app.slug);
}

export const visibleAppsCatalog: CatalogApp[] = appsCatalog.filter(isAppVisible);

export const sponsoredApps: SponsoredApp[] = [
  {
    name: "PixelForge",
    label: "Sponsored",
    pitch: "Partner app for advanced cinematic image generation workflows.",
    cta: "Explore partner",
    gradientClass: "from-fuchsia-500/35 via-violet-500/20 to-sky-500/25",
  },
  {
    name: "SoundMint",
    label: "Sponsored",
    pitch: "Generate background music packs for reels, launches, and ads.",
    cta: "View integration",
    gradientClass: "from-emerald-500/35 via-cyan-500/20 to-teal-500/25",
  },
];

export function findCatalogApp(slug: string): CatalogApp | undefined {
  return appsCatalog.find((app) => app.slug === slug);
}

export function findCatalogAppById(idOrSlug: string): CatalogApp | undefined {
  const byId = appsCatalog.find((app) => app.id === idOrSlug);
  if (byId) return byId;

  const normalizedSlug = normalizeCatalogAppSlug(idOrSlug);
  return appsCatalog.find((app) => app.slug === idOrSlug || app.slug === normalizedSlug);
}

export function findCatalogSubApp(
  appSlug: string,
  subAppSlug: string,
): CatalogSubApp | undefined {
  return findCatalogApp(appSlug)?.subApps?.find((subApp) => subApp.slug === subAppSlug);
}

export function getAppDetailHref(app: CatalogApp): string {
  return `/apps/${app.id}`;
}

export function getAppWorkspaceHref(appOrId: CatalogApp | string): string {
  const id = typeof appOrId === "string" ? appOrId : appOrId.id;
  return `/apps/${id}/workspace`;
}

export { getAppHelpContent, getAppHelpHref } from "./app-help-content";
export type { AppHelpContent, AppHelpSection } from "./app-help-content";

/** Apps with a live workspace route (not the marketing detail page). */
export type LaunchAppKey = "research-companion" | "photo-studio" | "clovai-projects";

const launchAppIdByKey: Record<LaunchAppKey, CatalogAppId> = {
  "research-companion": catalogAppIds.researchCompanion,
  "photo-studio": catalogAppIds.photoGenerator,
  "clovai-projects": catalogAppIds.clovaiProjects,
};

/** Canonical slug for launch routing (handles legacy aliases). */
export function normalizeCatalogAppSlug(slug: string): string {
  if (slug === "photo-generator") return "photo-studio";
  return slug;
}

/** Resolve launch UI from stable catalog id (preferred over slug). */
export function getLaunchAppKey(app: CatalogApp): LaunchAppKey | null {
  if (app.id === launchAppIdByKey["research-companion"]) return "research-companion";
  if (app.id === launchAppIdByKey["photo-studio"]) return "photo-studio";
  if (app.id === launchAppIdByKey["clovai-projects"]) return "clovai-projects";
  return null;
}

export function isLaunchApp(app: CatalogApp): boolean {
  return getLaunchAppKey(app) !== null;
}

export function getAppLaunchHref(app: CatalogApp): string | null {
  if (!isLaunchApp(app)) return null;
  return getAppWorkspaceHref(app);
}

export function isAppLaunchAvailable(app: CatalogApp, isAuthenticated: boolean): boolean {
  if (!getAppLaunchHref(app)) return false;
  return isAuthenticated;
}

export function getAppLaunchBlockReason(
  app: CatalogApp,
  isAuthenticated: boolean,
): "sign-in" | null {
  if (!getAppLaunchHref(app)) return null;
  if (isAuthenticated) return null;
  return "sign-in";
}

export function getAppAvailabilityRank(app: CatalogApp, isAuthenticated: boolean): number {
  if (isAppLaunchAvailable(app, isAuthenticated)) return 0;
  if (getAppLaunchHref(app)) return 1;
  return 2;
}

export function sortAppsByAvailability(
  apps: CatalogApp[],
  isAuthenticated: boolean,
): CatalogApp[] {
  return [...apps].sort((a, b) => {
    const rankDiff =
      getAppAvailabilityRank(a, isAuthenticated) - getAppAvailabilityRank(b, isAuthenticated);
    if (rankDiff !== 0) return rankDiff;
    return 0;
  });
}

export const featuredApps: CatalogApp[] = visibleAppsCatalog.filter((app) => app.featured);

export const appCategories: string[] = [
  "All",
  ...Array.from(new Set(visibleAppsCatalog.map((app) => app.category))),
];
