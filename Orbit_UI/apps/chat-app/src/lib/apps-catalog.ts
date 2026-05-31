export type AppTier = "starter" | "pro";

export type AppScreenshot = {
  title: string;
  caption: string;
  gradientClass: string;
};

export type CatalogApp = {
  slug: string;
  name: string;
  iconKey:
    | "wand"
    | "camera"
    | "brush"
    | "film"
    | "mic"
    | "image"
    | "sparkles";
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
    slug: "logo-studio",
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
    slug: "photo-generator",
    name: "Photo Generator",
    iconKey: "camera",
    category: "Image",
    tag: "Visuals",
    tier: "starter",
    tagline: "Studio-grade product and campaign photos, on demand.",
    heroGradient: "from-sky-600 via-cyan-600 to-blue-700",
    featured: true,
    shortDescription: "Create campaign photos and product visuals from text prompts.",
    description:
      "Photo Generator is optimized for social and e-commerce assets. Generate clean product scenes, lifestyle mockups, and ad visuals with consistent style controls and aspect presets.",
    monthlyUsers: "31.2k monthly users",
    usageCount: "2.1M images rendered",
    rating: 4.7,
    installs: "97k installs",
    modelAccess: "Starter model access",
    badges: ["Prompt templates", "Style lock", "Batch output"],
    screenshots: [
      {
        title: "Style presets",
        caption: "Pick cinematic, editorial, or studio lighting styles.",
        gradientClass: "from-sky-500/35 via-cyan-500/20 to-blue-500/30",
      },
      {
        title: "Campaign board",
        caption: "Generate multiple ad-ready outputs for one product.",
        gradientClass: "from-blue-500/35 via-indigo-500/20 to-cyan-500/25",
      },
      {
        title: "Refine controls",
        caption: "Tune color tone, composition, and shot distance.",
        gradientClass: "from-cyan-500/35 via-sky-500/25 to-emerald-500/20",
      },
    ],
  },
  {
    slug: "creative-editor",
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
    slug: "video-snippets",
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
    slug: "voice-maker",
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
    slug: "asset-remix",
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
];

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

export const featuredApps: CatalogApp[] = appsCatalog.filter((app) => app.featured);

export const appCategories: string[] = [
  "All",
  ...Array.from(new Set(appsCatalog.map((app) => app.category))),
];
