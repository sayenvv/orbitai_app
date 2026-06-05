"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Brush,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Crop,
  Download,
  Eraser,
  FileJson,
  FlipHorizontal2,
  FolderOpen,
  Group as GroupIcon,
  ImageIcon,
  ImagePlus,
  Home,
  LayoutTemplate,
  CircleHelp,
  Layers,
  Lasso,
  MessageCircle,
  MousePointer2,
  Move,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Palette,
  Loader2,
  Pipette,
  RotateCw,
  RotateCcw,
  Save,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Triangle,
  Type,
  Upload,
  Ungroup,
  Wand2,
  Minus,
  Spline,
  CircleDot,
  ArrowUpRight,
  Hexagon,
  Diamond,
  Trash2,
  Plus,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";

import { HexColorPicker } from "react-colorful";

import { PHOTO_STUDIO_IMAGE_FORMATS_LABEL } from "./image-formats";
import type { PhotoStudioMoreMenuItem } from "./photo-studio-nav-more-menu";
import { PhotoStudioNavMoreMenu } from "./photo-studio-nav-more-menu";
import { PhotoStudioWorkspaceChrome } from "./photo-studio-workspace-tab-bar";
import {
  PhotoStudioUploadsPanel,
  type PhotoStudioWorkspaceUpload,
} from "./photo-studio-uploads-panel";
import {
  buildCreationTypeOptions,
  isAllowedAspectRatio,
  resolvePhotoStudioOptions,
  type PhotoStudioOptionsConfig,
} from "./photo-studio-options";
import type Konva from "konva";
import type { CanvasShapeElement, PhotoStudioShapeType } from "./photo-studio-canvas-types";
import { shapePercentToBox } from "./photo-studio-canvas-types";
import {
  DEFAULT_SHAPE_ROTATION,
  getMaxShapeCornerRadius,
  normalizeShapeRotation,
  shapeSupportsCornerRadius,
  isImageShapeType,
  shapeUsesPathData,
} from "./photo-studio-canvas-types";
import { isChatGptSolidIcon } from "./photo-studio-chatgpt-logo";
import {
  buildLineLikePreviewPathD,
  getDefaultLinePoints,
  isLineLikeShapeType,
  lineShapeHasCurveHandle,
  normalizeLinePoints,
  resolveLinePoints,
} from "./photo-studio-line-geometry";
import {
  PATH_CHATGPT_ICON,
  PATH_CHATGPT_ICON_VIEWBOX,
  PATH_LOBE_UP,
  PATH_RING_SOFT,
} from "./photo-studio-path-presets";
import {
  DEFAULT_SIDE_GAP,
  SHAPE_SIDES,
  buildRectangleWithSideGapsPathD,
  normalizeShapeSideGaps,
  shapeHasSideGaps,
  shapeSupportsSideGaps,
  type ShapeSide,
  type SideGapConfig,
} from "./photo-studio-side-gaps";
import { snapShapeCenterPercents } from "./photo-studio-alignment-guides";
import { PhotoStudioColorPaletteGrid } from "./photo-studio-color-palette-grid";
import {
  normalizeHexColor,
  photoStudioColorPaletteGroups,
  photoStudioQuickColorSwatches,
  getReadableColorInputValue,
  hexColorsMatch,
  isLightHexColor,
} from "./photo-studio-color-palette";
import {
  drawPhotoStudioShapeStageToContext,
  PhotoStudioShapeStage,
  type CanvasSelectionBounds,
  type ShapeTransformPatch,
} from "./photo-studio-shape-stage";
import { parseCanvasLayersJson, type ParsedCanvasLayers } from "./photo-studio-canvas-import";
import { PhotoStudioWorkspaceShimmer } from "./photo-studio-workspace-shimmer";
import {
  CANVAS_SELECTION_PANEL_COMPACT_HEIGHT,
  CANVAS_SELECTION_PANEL_COMPACT_WIDTH,
  CANVAS_SELECTION_PANEL_MORE_HEIGHT,
  CANVAS_SELECTION_PANEL_MORE_WIDTH,
  CANVAS_SELECTION_PANEL_PADDING,
  PhotoStudioCanvasSelectionPanel,
} from "./photo-studio-canvas-selection-panel";

const WORKSPACE_PREPARE_DELAY_MS = 750;

export type { PhotoStudioShapeType } from "./photo-studio-canvas-types";

export type PhotoStudioCreationType = "logo" | "product" | "lifestyle" | "campaign";

export type { PhotoStudioWorkspaceTab } from "./photo-studio-workspace-tab-bar";
export { PhotoStudioWorkspaceChrome } from "./photo-studio-workspace-tab-bar";

export type RecentPhotoProject = {
  key: string;
  title: string;
  workspaceId?: string | null;
  assetId?: string | null;
  assetName?: string | null;
  openedAt: number;
};

export type PhotoStudioWorkspaceSnapshot = {
  title: string;
  assetId?: string | null;
  assetName?: string | null;
  aspectRatio: string;
  creationType: PhotoStudioCreationType;
  stylePreset: string;
  logoTransparentBackground: boolean;
  canvasBackgroundId: CanvasBackgroundId;
  customCanvasBackgroundColor: string;
  customCanvasGradientEnd: string;
  customCanvasGradientEnabled: boolean;
  projectName: string;
  canvasShapes: CanvasShapeElement[];
  canvasTexts: CanvasTextElement[];
  generatedItems: PhotoStudioGeneratedItem[];
  savedDesigns: PhotoStudioSavedDesign[];
  selectedGenerationId: string | null;
  materializedGenerationId: string | null;
};

export type PhotoStudioSavedDesign = {
  id: string;
  title: string;
  aspectRatio: string;
  canvasBackgroundId: CanvasBackgroundId;
  shapes: CanvasShapeElement[];
  texts: CanvasTextElement[];
  createdAt: number;
  source: "system" | "user";
};

export type PhotoStudioView = "home" | "workspace";

export type PhotoStudioCanvasFileActions = {
  openCanvasJsonFile: () => void;
  restoreExportedCanvasJson: () => void | Promise<void>;
};

export type CanvasBackgroundId =
  | "warm-paper"
  | "soft-stone"
  | "slate-haze"
  | "deep-charcoal"
  | "violet-sunset"
  | "cyan-ocean"
  | "fuchsia-pop"
  | "amber-glow"
  | "emerald-fresh"
  | "midnight"
  | "custom"
  | "checkerboard"
  | "white"
  | "black"
  | "light-gray"
  | "gray"
  | "slate"
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "teal"
  | "blue"
  | "indigo"
  | "violet"
  | "pink"
  | "rose";

export type PhotoStudioGeneratedItem = {
  id: string;
  prompt: string;
  creationType: PhotoStudioCreationType;
  aspectRatio: string;
  stylePreset: string;
  label: string;
  previewGradient: string;
  createdAt: number;
  transparentBackground?: boolean;
  canvasBackgroundId?: CanvasBackgroundId;
  variantIndex?: number;
  imageUrl?: string;
};

export type PhotoStudioAppProps = {
  assetId?: string | null;
  assetName?: string | null;
  assetImageUrl?: string | null;
  workspaceId?: string | null;
  initialWorkspaceSnapshot?: PhotoStudioWorkspaceSnapshot | null;
  initialView?: PhotoStudioView;
  recentProjects?: RecentPhotoProject[];
  onOpenRecentProject?: (project: RecentPhotoProject) => void;
  formatRecentTime?: (openedAt: number) => string;
  onOpenLibrary?: () => void;
  onUploadAsset?: () => void;
  workspaceUploads?: PhotoStudioWorkspaceUpload[];
  uploadsLoading?: boolean;
  uploadsError?: string | null;
  onSelectWorkspaceUpload?: (upload: PhotoStudioWorkspaceUpload) => void;
  onRefreshWorkspaceUploads?: () => void;
  onUploadImageFile?: (file: File) => void | Promise<void>;
  onOpenEmptyWorkspace?: () => void | Promise<void>;
  onResetDraftWorkspace?: () => void | Promise<void>;
  onNewWorkspace?: () => void;
  workspaceTabs?: import("./photo-studio-workspace-tab-bar").PhotoStudioWorkspaceTab[];
  activeWorkspaceTabId?: string | null;
  onSelectWorkspaceTab?: (tabId: string) => void;
  onCloseWorkspaceTab?: (tabId: string) => void;
  onNewWorkspaceTab?: () => void;
  isPreparingNewWorkspaceTab?: boolean;
  workspaceSessionKey?: number | string;
  onWorkspaceSnapshotChange?: (snapshot: PhotoStudioWorkspaceSnapshot) => void;
  onLoadDesigns?: (
    workspaceId: string | null,
  ) => Promise<{ templates: PhotoStudioSavedDesign[]; saved: PhotoStudioSavedDesign[] }>;
  onSaveWorkspace?: () => void;
  isSavingWorkspace?: boolean;
  workspacePersisted?: boolean;
  hasUnsavedWorkspaceChanges?: boolean;
  photoStudioOptions?: PhotoStudioOptionsConfig;
  onDeleteGeneration?: (id: string) => Promise<void>;
  onDeleteRecentProject?: (project: RecentPhotoProject) => Promise<void>;
  onFetchGeneration?: (id: string) => Promise<PhotoStudioGeneratedItem>;
  generationsLoading?: boolean;
  initialGenerationsFromApi?: PhotoStudioGeneratedItem[];
  onGenerate?: (input: {
    prompt: string;
    creationType: PhotoStudioCreationType;
    aspectRatio: string;
    stylePreset: string;
    transparentBackground?: boolean;
  }) => void | Promise<void | PhotoStudioGeneratedItem[]>;
  generating?: boolean;
  assetUploading?: boolean;
  assetUploadProgress?: string | null;
  assetUploadError?: string | null;
  onOpenHelp?: () => void;
  /** When true, header highlights Open while an existing workspace session is shown. */
  resumedFromLibrary?: boolean;
  /** Stable id for draft canvas JSON export/import (unsaved workspace). */
  canvasDraftId?: string;
  /** Load last server-exported canvas JSON (`GET /canvas-export`). */
  loadExportedCanvasJson?: (params: {
    workspaceId: string | null;
    draftId: string;
  }) => Promise<unknown | null>;
};

const creationTypes: Array<{
  id: PhotoStudioCreationType;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "logo",
    label: "Logo & brand",
    description: "Transparent PNG logos — preview on colorful backgrounds.",
    icon: Wand2,
  },
  {
    id: "product",
    label: "Product photo",
    description: "Clean studio shots and e-commerce visuals.",
    icon: ShoppingBag,
  },
  {
    id: "lifestyle",
    label: "Lifestyle scene",
    description: "Editorial mockups and in-context photography.",
    icon: Camera,
  },
  {
    id: "campaign",
    label: "Campaign visual",
    description: "Ads, banners, and social-ready creatives.",
    icon: ImagePlus,
  },
];

const aspectRatios = ["1:1", "4:5", "16:9", "9:16"] as const;

type CanvasDesignProfile = {
  title: string;
  emptyDescription: string;
  previewHintIdle: string;
  previewHintActive: string;
  navbarStatus: string;
  navbarEditingStatus: string;
  exportTransparentLabel: string;
  exportTransparentFilenameSuffix: string;
};

function getCanvasDesignByAspectRatio(aspectRatio: string): CanvasDesignProfile {
  switch (aspectRatio) {
    case "16:9":
      return {
        title: "Design a banner",
        emptyDescription:
          "Use shapes, text, and brush tools to compose your banner. Swap preview backgrounds in the left panel, then export a mockup or transparent PNG.",
        previewHintIdle:
          "Pick a background, then add shapes, text, and brush strokes to design your banner.",
        previewHintActive: "Preview your banner on different colorful backgrounds.",
        navbarStatus: "Banner canvas",
        navbarEditingStatus: "Designing banner",
        exportTransparentLabel: "Transparent PNG",
        exportTransparentFilenameSuffix: "-transparent",
      };
    case "4:5":
      return {
        title: "Design a product image",
        emptyDescription:
          "Use shapes, text, and brush tools to create your product visual. Swap preview backgrounds, then export when ready.",
        previewHintIdle:
          "Pick a background, then add shapes, text, and brush strokes to design your product image.",
        previewHintActive: "Preview your product image on different backgrounds.",
        navbarStatus: "Product canvas",
        navbarEditingStatus: "Designing product image",
        exportTransparentLabel: "Transparent PNG",
        exportTransparentFilenameSuffix: "-transparent",
      };
    case "9:16":
      return {
        title: "Design a story",
        emptyDescription:
          "Use shapes, text, and brush tools to create your vertical creative. Swap preview backgrounds, then export when ready.",
        previewHintIdle:
          "Pick a background, then add shapes, text, and brush strokes to design your story.",
        previewHintActive: "Preview your story on different colorful backgrounds.",
        navbarStatus: "Story canvas",
        navbarEditingStatus: "Designing story",
        exportTransparentLabel: "Transparent PNG",
        exportTransparentFilenameSuffix: "-transparent",
      };
    case "1:1":
    default:
      return {
        title: "Design a logo",
        emptyDescription:
          "Use shapes, text, and brush tools to build your logo. Swap preview backgrounds in the left panel, then export a transparent PNG or mockup.",
        previewHintIdle:
          "Pick a background, then add shapes, text, and brush strokes to design your logo.",
        previewHintActive: "Preview your logo on different colorful backgrounds.",
        navbarStatus: "Logo canvas",
        navbarEditingStatus: "Designing logo",
        exportTransparentLabel: "Logo PNG",
        exportTransparentFilenameSuffix: "-logo-transparent",
      };
  }
}

type PhotoStudioAspectRatio = (typeof aspectRatios)[number];

const aspectRatioOptions: Array<{
  id: PhotoStudioAspectRatio;
  intent: string;
}> = [
  { id: "1:1", intent: "Logo & brand mark" },
  { id: "4:5", intent: "Product & portrait" },
  { id: "16:9", intent: "Banner & hero" },
  { id: "9:16", intent: "Story & vertical" },
];

function AspectRatioFrame({
  ratio,
  selected = false,
}: {
  ratio: PhotoStudioAspectRatio;
  selected?: boolean;
}) {
  const frameSizes: Record<PhotoStudioAspectRatio, string> = {
    "1:1": "h-8 w-8",
    "4:5": "h-9 w-[1.45rem]",
    "16:9": "h-[1.35rem] w-10",
    "9:16": "h-10 w-[1.35rem]",
  };

  return (
    <span
      className={cn(
        "block shrink-0 rounded-[4px] border transition-colors duration-200",
        frameSizes[ratio],
        selected
          ? "border-foreground/30 bg-foreground/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:bg-white/[0.12]"
          : "border-border/50 bg-muted/40 group-hover:border-border/70 group-hover:bg-muted/55",
      )}
      aria-hidden
    />
  );
}

function isPhotoStudioAspectRatio(value: string): value is PhotoStudioAspectRatio {
  return (aspectRatios as readonly string[]).includes(value);
}

function AspectRatioPicker({
  value,
  onChange,
  variant = "premium",
  ratioOptions = aspectRatioOptions,
}: {
  value: PhotoStudioAspectRatio;
  onChange: (ratio: PhotoStudioAspectRatio) => void;
  variant?: "premium" | "compact";
  ratioOptions?: Array<{ id: string; intent: string }>;
}) {
  const ratios = ratioOptions.map((option) => option.id);

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Aspect ratio">
        {ratios.map((ratio) => (
          <button
            key={ratio}
            type="button"
            onClick={() => onChange(ratio as PhotoStudioAspectRatio)}
            aria-pressed={value === ratio}
            className={cn(
              "inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-semibold transition-colors",
              value === ratio
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted",
            )}
          >
            {ratio}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Aspect ratio">
      {ratioOptions.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id as PhotoStudioAspectRatio)}
            aria-pressed={selected}
            aria-label={`${option.id} — ${option.intent}`}
            className={cn(
              "group relative flex flex-col items-center gap-2.5 rounded-xl border px-2 py-3 text-center transition-all duration-200",
              selected
                ? "border-black/[0.1] bg-white/80 shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] dark:border-white/[0.14] dark:bg-white/[0.08] dark:ring-white/[0.06]"
                : "border-black/[0.06] bg-white/50 hover:border-black/[0.1] hover:bg-white/70 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
            )}
          >
            {selected ? (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            ) : (
              <span className="absolute right-1.5 top-1.5 h-4 w-4 rounded-full border border-border/40 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100" />
            )}
            <AspectRatioFrame ratio={option.id as PhotoStudioAspectRatio} selected={selected} />
            <span className="min-w-0 px-0.5">
              <span
                className={cn(
                  "block text-[11px] font-semibold tracking-tight",
                  selected ? "text-foreground" : "text-foreground/90",
                )}
              >
                {option.id}
              </span>
              <span className="mt-0.5 block text-[9px] leading-snug text-muted-foreground">
                {option.intent}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const stylePresets = [
  { id: "studio", label: "Studio clean" },
  { id: "editorial", label: "Editorial" },
  { id: "cinematic", label: "Cinematic" },
  { id: "minimal", label: "Minimal brand" },
] as const;

type AccentTheme = {
  badge: string;
  icon: string;
  card: string;
  panelHeader: string;
  glow: string;
};

// Unified, chat-page–aligned surface: warm white cards, soft neutral borders.
const sharedAccentTheme: AccentTheme = {
  badge:
    "bg-foreground/[0.06] text-muted-foreground ring-1 ring-black/[0.06] dark:bg-white/[0.08] dark:text-foreground/80 dark:ring-white/[0.08]",
  icon: "bg-foreground text-background shadow-sm",
  card: "border border-black/[0.06] bg-white/70 hover:-translate-y-0.5 hover:border-black/[0.1] hover:bg-white hover:shadow-[0_10px_28px_-12px_rgba(15,23,42,0.14)] dark:border-white/[0.12] dark:bg-white/[0.04] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.07]",
  panelHeader: "from-foreground/[0.04] via-foreground/[0.02] to-transparent",
  glow: "bg-primary/20",
};

const accentThemes = {
  neutral: sharedAccentTheme,
  violet: sharedAccentTheme,
  cyan: sharedAccentTheme,
  fuchsia: sharedAccentTheme,
  amber: sharedAccentTheme,
  emerald: sharedAccentTheme,
  rose: sharedAccentTheme,
} as const satisfies Record<string, AccentTheme>;

const recentAccentKeys = ["neutral"] as const;

const creationTypeAccents: Record<PhotoStudioCreationType, keyof typeof accentThemes> = {
  logo: "neutral",
  product: "neutral",
  lifestyle: "neutral",
  campaign: "neutral",
};

const GENERATION_BATCH_SIZE = 4;

const generationPreviewGradients = [
  "from-zinc-300 via-zinc-200 to-stone-200",
  "from-stone-300 via-zinc-300 to-neutral-200",
  "from-neutral-300 via-stone-200 to-zinc-300",
  "from-slate-300 via-zinc-200 to-stone-300",
] as const;

const canvasBackgroundPresets: Array<{
  id: CanvasBackgroundId;
  label: string;
  css?: string;
  tailwind?: string;
  solidColor?: string;
  checkerboard?: boolean;
  exportStops?: Array<{ offset: number; color: string }>;
}> = [
  {
    id: "warm-paper",
    label: "Warm paper",
    css: "linear-gradient(180deg, #fafaf9 0%, #f4f4f5 100%)",
    tailwind: "from-stone-50 to-zinc-100",
    exportStops: [
      { offset: 0, color: "#fafaf9" },
      { offset: 1, color: "#f4f4f5" },
    ],
  },
  {
    id: "soft-stone",
    label: "Soft stone",
    css: "linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #d6d3d1 100%)",
    tailwind: "from-stone-100 via-stone-200 to-stone-300",
    exportStops: [
      { offset: 0, color: "#f5f5f4" },
      { offset: 0.5, color: "#e7e5e4" },
      { offset: 1, color: "#d6d3d1" },
    ],
  },
  {
    id: "slate-haze",
    label: "Slate haze",
    css: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
    tailwind: "from-slate-50 via-slate-200 to-slate-300",
    exportStops: [
      { offset: 0, color: "#f8fafc" },
      { offset: 0.5, color: "#e2e8f0" },
      { offset: 1, color: "#cbd5e1" },
    ],
  },
  {
    id: "deep-charcoal",
    label: "Deep charcoal",
    css: "linear-gradient(135deg, #27272a 0%, #3f3f46 50%, #52525b 100%)",
    tailwind: "from-zinc-800 via-zinc-700 to-zinc-600",
    exportStops: [
      { offset: 0, color: "#27272a" },
      { offset: 0.5, color: "#3f3f46" },
      { offset: 1, color: "#52525b" },
    ],
  },
  {
    id: "violet-sunset",
    label: "Violet sunset",
    css: "linear-gradient(135deg, #7c3aed 0%, #d946ef 50%, #06b6d4 100%)",
    tailwind: "from-violet-600 via-fuchsia-500 to-cyan-500",
    exportStops: [
      { offset: 0, color: "#7c3aed" },
      { offset: 0.5, color: "#d946ef" },
      { offset: 1, color: "#06b6d4" },
    ],
  },
  {
    id: "cyan-ocean",
    label: "Cyan ocean",
    css: "linear-gradient(135deg, #0891b2 0%, #0ea5e9 50%, #2563eb 100%)",
    tailwind: "from-cyan-600 via-sky-500 to-blue-600",
    exportStops: [
      { offset: 0, color: "#0891b2" },
      { offset: 0.5, color: "#0ea5e9" },
      { offset: 1, color: "#2563eb" },
    ],
  },
  {
    id: "fuchsia-pop",
    label: "Fuchsia pop",
    css: "linear-gradient(135deg, #c026d3 0%, #ec4899 50%, #f43f5e 100%)",
    tailwind: "from-fuchsia-600 via-pink-500 to-rose-500",
    exportStops: [
      { offset: 0, color: "#c026d3" },
      { offset: 0.5, color: "#ec4899" },
      { offset: 1, color: "#f43f5e" },
    ],
  },
  {
    id: "amber-glow",
    label: "Amber glow",
    css: "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)",
    tailwind: "from-amber-600 via-amber-500 to-yellow-400",
    exportStops: [
      { offset: 0, color: "#d97706" },
      { offset: 0.5, color: "#f59e0b" },
      { offset: 1, color: "#fbbf24" },
    ],
  },
  {
    id: "emerald-fresh",
    label: "Emerald fresh",
    css: "linear-gradient(135deg, #059669 0%, #10b981 50%, #14b8a6 100%)",
    tailwind: "from-emerald-600 via-emerald-500 to-teal-500",
    exportStops: [
      { offset: 0, color: "#059669" },
      { offset: 0.5, color: "#10b981" },
      { offset: 1, color: "#14b8a6" },
    ],
  },
  {
    id: "midnight",
    label: "Midnight",
    css: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)",
    tailwind: "from-zinc-900 via-zinc-800 to-zinc-700",
    exportStops: [
      { offset: 0, color: "#18181b" },
      { offset: 0.5, color: "#27272a" },
      { offset: 1, color: "#3f3f46" },
    ],
  },
  {
    id: "custom",
    label: "Custom color",
  },
  {
    id: "checkerboard",
    label: "Checkerboard",
    checkerboard: true,
  },
];

const legacyCanvasSolidColors: Partial<Record<CanvasBackgroundId, string>> = {
  white: "#ffffff",
  black: "#0a0a0a",
  "light-gray": "#f1f5f9",
  gray: "#94a3b8",
  slate: "#475569",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#fbbf24",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  pink: "#ec4899",
  rose: "#f43f5e",
};

const DEFAULT_CUSTOM_CANVAS_BACKGROUND = "#a8a29e";

const premiumCanvasGradientIds: CanvasBackgroundId[] = [
  "warm-paper",
  "soft-stone",
  "slate-haze",
  "deep-charcoal",
  "midnight",
];

const canvasGradientBackgroundPresets = canvasBackgroundPresets.filter(
  (preset) =>
    preset.exportStops &&
    !preset.checkerboard &&
    premiumCanvasGradientIds.includes(preset.id as CanvasBackgroundId),
);
const canvasSpecialBackgroundPresets = canvasBackgroundPresets.filter(
  (preset) => preset.id === "custom" || preset.checkerboard,
);

const defaultCanvasBackgroundIds: CanvasBackgroundId[] = [
  "warm-paper",
  "soft-stone",
  "slate-haze",
  "white",
];

const checkerboardBackgroundStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
};

/** Theme-aware dot grid + surface — defined in chat-app globals.css */
const canvasWorkspaceClasses = "canvas-workspace-premium";

const CANVAS_ZOOM_MIN = 0.5;
const CANVAS_ZOOM_MAX = 2;
const CANVAS_ZOOM_STEP = 0.1;
const CANVAS_ZOOM_DEFAULT = 1;

function clampCanvasZoom(value: number) {
  return Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, Number(value.toFixed(2))));
}

function CanvasZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const canZoomOut = zoom > CANVAS_ZOOM_MIN;
  const canZoomIn = zoom < CANVAS_ZOOM_MAX;
  const isDefaultZoom = zoom === CANVAS_ZOOM_DEFAULT;

  return (
    <div className="pointer-events-none absolute right-5 top-5 z-30 md:right-6 md:top-6">
      <div className="pointer-events-auto inline-flex items-center gap-0.5 rounded-full border border-black/[0.06] bg-white/80 p-0.5 shadow-[0_4px_18px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-white/[0.12] dark:bg-white/[0.08]">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isDefaultZoom}
          aria-label={`Canvas zoom ${Math.round(zoom * 100)} percent`}
          title={isDefaultZoom ? "Canvas zoom" : "Reset zoom to 100%"}
          className={cn(
            "min-w-[2.85rem] rounded-md px-2 py-1 text-center text-[10px] font-semibold tabular-nums transition-colors",
            isDefaultZoom
              ? "text-foreground"
              : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
          )}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}

function getCanvasBackgroundPreset(id: CanvasBackgroundId) {
  const legacyColor = legacyCanvasSolidColors[id];
  if (legacyColor) {
    return {
      id,
      label: id.replace(/-/g, " "),
      solidColor: legacyColor,
    };
  }

  return (
    canvasBackgroundPresets.find((preset) => preset.id === id) ??
    canvasBackgroundPresets.find((preset) => preset.id === "warm-paper") ??
    canvasBackgroundPresets[0]
  );
}

function resolveCanvasBackgroundStyle(
  backgroundId: CanvasBackgroundId,
  customColor: string,
  customGradientEnd?: string,
): CSSProperties | undefined {
  const preset = getCanvasBackgroundPreset(backgroundId);
  if (preset.checkerboard) return checkerboardBackgroundStyle;
  if (preset.solidColor) return { background: preset.solidColor };
  if (backgroundId === "custom") {
    if (customGradientEnd && customGradientEnd !== customColor) {
      return {
        background: `linear-gradient(135deg, ${customColor} 0%, ${customGradientEnd} 100%)`,
      };
    }
    return { background: customColor };
  }
  return preset.css ? { background: preset.css } : undefined;
}

function CanvasBackgroundPresetButton({
  preset,
  selected,
  onSelect,
  previewStyle,
  variant = "labeled",
}: {
  preset: (typeof canvasBackgroundPresets)[number];
  selected: boolean;
  onSelect: () => void;
  previewStyle?: CSSProperties;
  variant?: "solid" | "labeled";
}) {
  const isSolid = Boolean(preset.solidColor);
  const isLight = preset.solidColor ? isLightHexColor(preset.solidColor) : false;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={preset.label}
      aria-label={preset.label}
      aria-pressed={selected}
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 transition-all duration-200",
        variant === "solid" ? "aspect-square" : "aspect-square",
        selected
          ? "border-foreground/25 shadow-[0_0_0_3px_rgba(15,23,42,0.08)] dark:border-white/25 dark:shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
          : "border-black/[0.08] hover:border-black/[0.14] hover:shadow-md dark:border-white/[0.1] dark:hover:border-white/[0.16]",
        isSolid && isLight && !selected && "border-border/45",
      )}
    >
      {preset.id === "custom" ? (
        <span className="absolute inset-0" style={previewStyle} />
      ) : preset.checkerboard ? (
        <span className="absolute inset-0" style={checkerboardBackgroundStyle} />
      ) : preset.solidColor ? (
        <span className="absolute inset-0" style={{ background: preset.solidColor }} />
      ) : (
        <span className={cn("absolute inset-0 bg-gradient-to-br", preset.tailwind)} />
      )}

      {!isSolid ? (
        <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10 opacity-80" />
      ) : null}

      {preset.id === "custom" ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Palette className="h-4 w-4 text-white drop-shadow-md" />
        </span>
      ) : null}

      {selected ? (
        <span
          className={cn(
            "absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full shadow-sm",
            "bg-foreground text-background",
          )}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      ) : null}

      {variant === "labeled" && !isSolid ? (
        <span className="absolute inset-x-0 bottom-0 px-1 pb-1 pt-4 text-center">
          <span className="block truncate text-[8px] font-semibold leading-none text-white drop-shadow">
            {preset.label}
          </span>
        </span>
      ) : null}
    </button>
  );
}

function getLogoInitials(prompt: string): string {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "LG";
}

function getLogoWordmark(prompt: string): string {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  return words[0]?.slice(0, 20) ?? "Logo";
}

function drawCanvasBackgroundToContext(
  ctx: CanvasRenderingContext2D,
  backgroundId: CanvasBackgroundId,
  width: number,
  height: number,
  customColor = DEFAULT_CUSTOM_CANVAS_BACKGROUND,
  customGradientEnd?: string,
) {
  const preset = getCanvasBackgroundPreset(backgroundId);
  if (preset.checkerboard) {
    drawCheckerboardBackground(ctx, width, height);
    return;
  }
  if (preset.solidColor) {
    ctx.fillStyle = preset.solidColor;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (backgroundId === "custom") {
    if (customGradientEnd && customGradientEnd !== customColor) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, customColor);
      gradient.addColorStop(1, customGradientEnd);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = customColor;
    }
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  for (const stop of preset.exportStops ?? []) {
    gradient.addColorStop(stop.offset, stop.color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawLogoPreviewToContext(
  ctx: CanvasRenderingContext2D,
  prompt: string,
  width: number,
  height: number,
  variantIndex = 0,
) {
  const initials = getLogoInitials(prompt);
  const wordmark = getLogoWordmark(prompt);
  const cx = width / 2;
  const markRadius = Math.min(width, height) * 0.14;
  const markCenterY = height * 0.42 + variantIndex * 2;
  const accentHue = (variantIndex * 72 + 260) % 360;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = Math.max(8, markRadius * 0.35);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, markCenterY, markRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = `hsl(${accentHue} 65% 48%)`;
  ctx.font = `700 ${markRadius * 0.72}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, cx, markCenterY + markRadius * 0.02);

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${Math.max(14, markRadius * 0.38)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(wordmark, cx, markCenterY + markRadius * 1.55, width * 0.88);
  ctx.restore();
}

function GeneratedLogoPreview({
  prompt,
  variantIndex = 0,
}: {
  prompt: string;
  variantIndex?: number;
}) {
  const initials = getLogoInitials(prompt);
  const wordmark = getLogoWordmark(prompt);
  const accentHue = (variantIndex * 72 + 260) % 360;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-[14%]">
      <div className="flex w-full max-w-[78%] flex-col items-center gap-[0.35em] text-center">
        <div
          className="flex aspect-square w-[38%] items-center justify-center rounded-full bg-white shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
          aria-hidden
        >
          <span
            className="text-[clamp(1.25rem,8cqi,3.5rem)] font-bold leading-none"
            style={{ color: `hsl(${accentHue} 65% 48%)` }}
          >
            {initials}
          </span>
        </div>
        <p className="w-full truncate text-[clamp(0.75rem,4.5cqi,1.35rem)] font-semibold leading-tight text-zinc-900 drop-shadow-sm dark:text-zinc-100">
          {wordmark}
        </p>
      </div>
    </div>
  );
}

function createGenerationBatch(
  input: {
    prompt: string;
    creationType: PhotoStudioCreationType;
    aspectRatio: string;
    stylePreset: string;
    transparentBackground?: boolean;
  },
  batchSize = GENERATION_BATCH_SIZE,
): PhotoStudioGeneratedItem[] {
  const batchId = `${Date.now()}`;
  const isTransparentLogo = input.creationType === "logo" && input.transparentBackground !== false;
  return Array.from({ length: batchSize }, (_, index) => ({
    id: `${batchId}-${index}`,
    prompt: input.prompt,
    creationType: input.creationType,
    aspectRatio: input.aspectRatio,
    stylePreset: input.stylePreset,
    label: isTransparentLogo ? `Logo ${index + 1}` : `Variant ${index + 1}`,
    previewGradient: generationPreviewGradients[index % generationPreviewGradients.length],
    createdAt: Date.now(),
    transparentBackground: isTransparentLogo,
    canvasBackgroundId: isTransparentLogo
      ? defaultCanvasBackgroundIds[index % defaultCanvasBackgroundIds.length]
      : undefined,
    variantIndex: index,
  }));
}

const GENERATION_LAYER_PREFIX = "gen-";

function isGenerationLayerId(id: string): boolean {
  return id.startsWith(GENERATION_LAYER_PREFIX);
}

function generationLayerId(generationId: string, suffix: string): string {
  return `${GENERATION_LAYER_PREFIX}${generationId}-${suffix}`;
}

function getGenerationAccentColor(variantIndex = 0): string {
  const accentHue = (variantIndex * 72 + 260) % 360;
  return `hsl(${accentHue} 65% 48%)`;
}

function buildLayersFromGeneration(item: PhotoStudioGeneratedItem): {
  shapes: CanvasShapeElement[];
  texts: CanvasTextElement[];
} {
  const variantIndex = item.variantIndex ?? 0;
  const accentColor = getGenerationAccentColor(variantIndex);

  if (item.transparentBackground && item.creationType === "logo") {
    const initials = getLogoInitials(item.prompt);
    const wordmark = getLogoWordmark(item.prompt);
    return {
      shapes: [
        {
          id: generationLayerId(item.id, "mark"),
          shapeType: "circle",
          x: 50,
          y: 42,
          width: 28,
          height: 28,
          strokeWidth: 1,
          strokeColor: "#f3f4f6",
          fillColor: "#ffffff",
          fillOpacity: 1,
          cornerRadius: 0,
          rotation: 0,
          groupId: null,
          pathData: undefined,
          label: "",
        },
      ],
      texts: [
        {
          id: generationLayerId(item.id, "initials"),
          x: 50,
          y: 42,
          width: 18,
          height: 8,
          content: initials,
          fontStyleId: "bold-headline",
          fontSize: 34,
          color: accentColor,
        },
        {
          id: generationLayerId(item.id, "wordmark"),
          x: 50,
          y: 58,
          width: 72,
          height: 10,
          content: wordmark,
          fontStyleId: "modern-sans",
          fontSize: 26,
          color: "#ffffff",
        },
      ],
    };
  }

  return {
    shapes: [
      {
        id: generationLayerId(item.id, "frame"),
        shapeType: "rectangle",
        x: 50,
        y: 46,
        width: 78,
        height: 58,
        strokeWidth: 2,
        strokeColor: "rgba(255,255,255,0.55)",
        fillColor: "#ffffff",
        fillOpacity: 0.12,
        cornerRadius: 14,
        rotation: 0,
        groupId: null,
        pathData: undefined,
        label: "",
      },
    ],
    texts: [
      {
        id: generationLayerId(item.id, "caption"),
        x: 50,
        y: 86,
        width: 84,
        height: 12,
        content: item.prompt.trim().slice(0, 96) || item.label,
        fontStyleId: "modern-sans",
        fontSize: 16,
        color: "#ffffff",
      },
    ],
  };
}

function GeneratedItemsGrid({
  items,
  selectedId,
  materializedId,
  onSelect,
  onDelete,
  deletingId,
  creationTypeLabels,
}: {
  items: PhotoStudioGeneratedItem[];
  selectedId?: string | null;
  materializedId?: string | null;
  onSelect: (item: PhotoStudioGeneratedItem) => void;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
  creationTypeLabels?: Record<string, string>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/[0.1] bg-muted/15 dark:border-white/[0.18] dark:bg-white/[0.03] px-3 py-6 text-center">
        <Sparkles className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-xs font-semibold text-foreground">No generations yet</p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          Generate from the Prompt tool to add logos and visuals here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => {
        const selected = selectedId === item.id;
        const onCanvas = materializedId === item.id;
        return (
          <div key={item.id} className="group relative">
            {onDelete ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void onDelete(item.id);
                }}
                disabled={deletingId === item.id}
                className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 disabled:opacity-50"
                aria-label={`Delete ${item.label}`}
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
            ) : null}
            <button
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "w-full overflow-hidden rounded-xl border text-left transition-all",
              selected
                ? "border-primary/40 ring-2 ring-primary/15"
                : "border-border/40 hover:border-primary/25",
            )}
          >
            <div
              className={cn(
                "relative flex aspect-square items-end overflow-hidden bg-gradient-to-br p-2",
                !item.transparentBackground && item.previewGradient,
              )}
            >
              {onCanvas ? (
                <span className="absolute right-1.5 top-1.5 z-10 rounded bg-primary px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-primary-foreground">
                  On canvas
                </span>
              ) : null}
              {item.transparentBackground ? (
                <>
                  <div
                    className="absolute inset-0"
                    style={resolveCanvasBackgroundStyle(
                      item.canvasBackgroundId ?? "warm-paper",
                      DEFAULT_CUSTOM_CANVAS_BACKGROUND,
                    )}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary shadow-md">
                      {getLogoInitials(item.prompt)}
                    </div>
                    <span className="max-w-full truncate text-[8px] font-semibold text-white drop-shadow">
                      {getLogoWordmark(item.prompt)}
                    </span>
                  </div>
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/45 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white">
                    PNG
                  </span>
                </>
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_42%)]" />
              )}
              <span className="relative rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                {item.label}
              </span>
            </div>
            <div className="border-t border-border/30 bg-background/95 px-2 py-1.5">
              <p className="truncate text-[10px] font-semibold text-foreground">
                {creationTypeLabels?.[item.creationType] ??
                  creationTypes.find((type) => type.id === item.creationType)?.label ??
                  "Visual"}
              </p>
              <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{item.aspectRatio}</p>
            </div>
          </button>
          </div>
        );
      })}
    </div>
  );
}

type SavedCanvasDesign = PhotoStudioSavedDesign & {
  aspectRatio: PhotoStudioAspectRatio;
};

type CanvasLayerListItem = {
  id: string;
  kind: "shape" | "text";
  label: string;
  color: string;
  shapeType?: PhotoStudioShapeType;
};

function DesignPreviewThumbnail({
  design,
  aspectRatio,
  variant = "compact",
}: {
  design: Pick<SavedCanvasDesign, "shapes" | "texts" | "canvasBackgroundId">;
  aspectRatio: PhotoStudioAspectRatio;
  variant?: "compact" | "card";
}) {
  const aspectClass =
    variant === "card"
      ? "aspect-square"
      : aspectRatio === "1:1"
        ? "aspect-square"
        : aspectRatio === "4:5"
          ? "aspect-[4/5]"
          : aspectRatio === "16:9"
            ? "aspect-video"
            : "aspect-[9/16]";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        variant === "card" ? "w-full rounded-none" : "mx-auto w-full max-w-[72px] rounded-lg ring-1 ring-black/10",
        aspectClass,
      )}
      style={resolveCanvasBackgroundStyle(design.canvasBackgroundId, DEFAULT_CUSTOM_CANVAS_BACKGROUND)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
      {design.shapes.slice(0, 4).map((shape, index) => (
        <span
          key={shape.id}
          className="absolute rounded-full ring-1 ring-white/40"
          style={{
            background: shape.fillColor,
            width: `${18 + index * 4}%`,
            height: `${18 + index * 4}%`,
            left: `${20 + index * 14}%`,
            top: `${22 + (index % 2) * 18}%`,
            opacity: 0.85,
          }}
        />
      ))}
      {design.texts.length > 0 && variant === "compact" ? (
        <span
          className={cn(
            "absolute bottom-1.5 left-1.5 right-1.5 truncate rounded bg-black/35 px-1 py-0.5 font-semibold text-white",
            "text-[6px]",
          )}
        >
          {design.texts[0]?.content}
        </span>
      ) : null}
    </div>
  );
}

function DesignsPanelSkeleton() {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="h-2.5 w-24 animate-pulse rounded-full bg-muted/60" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[4/5] animate-pulse rounded-xl bg-muted/40 dark:bg-white/[0.06]"
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-20 animate-pulse rounded-full bg-muted/60" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`template-${index}`}
              className="aspect-[4/5] animate-pulse rounded-xl bg-muted/35 dark:bg-white/[0.05]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OwnDesignsGrid({
  items,
  searchQuery,
  filterAspectRatio,
  activeId,
  onSelect,
  onDelete,
}: {
  items: SavedCanvasDesign[];
  searchQuery: string;
  filterAspectRatio: PhotoStudioAspectRatio;
  activeId?: string | null;
  onSelect: (design: SavedCanvasDesign) => void;
  onDelete: (id: string) => void;
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return items.filter((design) => {
      if (design.aspectRatio !== filterAspectRatio) return false;
      if (!normalizedQuery) return true;
      const intent = aspectRatioOptions.find((option) => option.id === design.aspectRatio)?.intent ?? "";
      return (
        design.title.toLowerCase().includes(normalizedQuery) ||
        design.aspectRatio.includes(normalizedQuery) ||
        intent.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filterAspectRatio, items, normalizedQuery]);

  const visibleItems = filteredItems;

  if (items.filter((design) => design.aspectRatio === filterAspectRatio).length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/[0.1] bg-muted/15 dark:border-white/[0.18] dark:bg-white/[0.03] px-3 py-6 text-center">
        <Layers className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-xs font-semibold text-foreground">No templates yet</p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          Starter layouts for this canvas format will appear here.
        </p>
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/[0.1] bg-muted/15 dark:border-white/[0.18] dark:bg-white/[0.03] px-3 py-6 text-center">
        <Search className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-xs font-semibold text-foreground">No templates found</p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          Try a different search term or clear the filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border/25 ring-1 ring-border/25">
      {visibleItems.map((design) => {
        const active = activeId === design.id;
        return (
          <div key={design.id} className="group relative bg-background">
            <button
              type="button"
              onClick={() => onSelect(design)}
              aria-label={design.title}
              aria-pressed={active}
              className={cn(
                "relative block w-full overflow-hidden transition-all duration-200",
                active ? "ring-2 ring-inset ring-primary/70" : "hover:ring-1 hover:ring-inset hover:ring-primary/25",
              )}
            >
              <DesignPreviewThumbnail
                design={design}
                aspectRatio={design.aspectRatio}
                variant="card"
              />
              {active ? (
                <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Check className="h-2 w-2" strokeWidth={3} />
                </span>
              ) : null}
            </button>
            {design.source === "user" ? (
              <button
                type="button"
                onClick={() => onDelete(design.id)}
                aria-label={`Remove ${design.title}`}
                className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CanvasLayersList({
  layers,
  selectedShapeId,
  selectedTextId,
  onSelectLayer,
}: {
  layers: CanvasLayerListItem[];
  selectedShapeId?: string | null;
  selectedTextId?: string | null;
  onSelectLayer: (layer: CanvasLayerListItem) => void;
}) {
  if (layers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/[0.1] bg-muted/10 dark:border-white/[0.18] dark:bg-white/[0.03] px-3 py-4 text-center">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Canvas layers will appear here as you add shapes and text.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {layers.map((layer) => {
        const selected =
          (layer.kind === "shape" && selectedShapeId === layer.id) ||
          (layer.kind === "text" && selectedTextId === layer.id);
        const ShapeIcon =
          layer.kind === "shape" && layer.shapeType
            ? layer.shapeType === "image"
              ? ImageIcon
              : (shapeTypes.find((shape) => shape.id === layer.shapeType)?.icon ?? Square)
            : layer.kind === "text"
              ? Type
              : Square;

        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => onSelectLayer(layer)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all",
              selected
                ? "border-primary/30 bg-foreground/[0.07] ring-1 ring-primary/15"
                : "border-border/30 bg-background/50 hover:bg-background",
            )}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-border/30"
              style={{ background: `${layer.color}22`, color: layer.color }}
            >
              <ShapeIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-foreground">{layer.label}</span>
              <span className="block text-[9px] capitalize text-muted-foreground">{layer.kind}</span>
            </span>
            {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}

type LeftPanelTab = "assets" | "uploads" | "designs" | "generations";

type AssetsPanelSection = "canvasFormat" | "background";

const leftSidebarTabs: Array<{
  id: LeftPanelTab;
  label: string;
  shortLabel: string;
  hint: string;
  icon: LucideIcon;
}> = [
  {
    id: "assets",
    label: "Assets",
    shortLabel: "Assets",
    hint: "Canvas format and color palette",
    icon: FolderOpen,
  },
  {
    id: "uploads",
    label: "Uploads",
    shortLabel: "Uploads",
    hint: "Uploaded images and workspace reference",
    icon: ImagePlus,
  },
  {
    id: "designs",
    label: "Designs",
    shortLabel: "Designs",
    hint: "Starter templates provided by the app",
    icon: Layers,
  },
  {
    id: "generations",
    label: "Generations",
    shortLabel: "AI Gen",
    hint: "AI-generated visual variants",
    icon: Sparkles,
  },
];
type WorkspaceTool =
  | "select"
  | "move"
  | "crop"
  | "brush"
  | "eraser"
  | "text"
  | "shape"
  | "eyedropper"
  | "mask"
  | "adjust"
  | "flip"
  | "rotate"
  | "layers";
type AssistPanel = "prompt" | "chat";

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type ShapeToolDef = { id: PhotoStudioShapeType; label: string; icon: LucideIcon };

const primitiveShapeTools: ShapeToolDef[] = [
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "square", label: "Square", icon: Square },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "star", label: "Star", icon: Star },
  { id: "hexagon", label: "Hexagon", icon: Hexagon },
  { id: "diamond", label: "Diamond", icon: Diamond },
];

const lineShapeTools: ShapeToolDef[] = [
  { id: "line", label: "Straight", icon: Minus },
  { id: "curvedLine", label: "Curved", icon: Spline },
  { id: "arc", label: "Arc", icon: CircleDot },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight },
];

const shapeTypes: ShapeToolDef[] = [...primitiveShapeTools, ...lineShapeTools];

const shapeToolGroups: Array<{ title: string; tools: ShapeToolDef[] }> = [
  { title: "Shapes", tools: primitiveShapeTools },
  { title: "Lines", tools: lineShapeTools },
];

const SHAPE_DRAG_MIME = "application/x-photo-studio-shape";
const MIN_SHAPE_SIZE = 4;
const SHAPE_VIEWBOX_INSET = 4;
const SHAPE_VIEWBOX_SIZE = 100 - SHAPE_VIEWBOX_INSET * 2;
const DEFAULT_SHAPE_STROKE_WIDTH = 5;
const MIN_SHAPE_STROKE_WIDTH = 1;
const MAX_SHAPE_STROKE_WIDTH = 16;
const DEFAULT_SHAPE_STROKE_COLOR = "#000000";
const DEFAULT_SHAPE_FILL_COLOR = "#ffffff";
const DEFAULT_SHAPE_FILL_OPACITY = 1;
const DEFAULT_SHAPE_CORNER_RADIUS = 3;
const MIN_SHAPE_CORNER_RADIUS = 0;

const DEFAULT_BRUSH_COLOR = "#000000";
const DEFAULT_BRUSH_SIZE = 8;
const MIN_BRUSH_SIZE = 2;
const MAX_BRUSH_SIZE = 32;
const DEFAULT_BRUSH_OPACITY = 1;

const DEFAULT_TEXT_COLOR = "#18181b";
const DEFAULT_TEXT_FONT_SIZE = 28;
const MIN_TEXT_FONT_SIZE = 12;
const MAX_TEXT_FONT_SIZE = 96;
const DEFAULT_TEXT_WIDTH = 32;
const MIN_TEXT_WIDTH = 12;
const MAX_TEXT_WIDTH = 80;

export type PhotoStudioFontStyleId =
  | "modern-sans"
  | "classic-serif"
  | "display-serif"
  | "bold-headline"
  | "light-minimal"
  | "monospace"
  | "script"
  | "handwritten"
  | "condensed"
  | "rounded";

type FontCategory = "sans-serif" | "serif" | "display" | "monospace" | "script";

type PhotoStudioFontStyle = {
  id: PhotoStudioFontStyleId;
  label: string;
  category: FontCategory;
  sample: string;
  preview: string;
  fontFamily: string;
  fontWeight: number | string;
  fontStyle?: "normal" | "italic";
  letterSpacing?: string;
  textTransform?: "none" | "uppercase";
};

const fontCategoryLabels: Record<FontCategory, string> = {
  "sans-serif": "Sans Serif",
  serif: "Serif",
  display: "Display",
  monospace: "Monospace",
  script: "Script & Handwriting",
};

const fontCategoryOrder: FontCategory[] = ["sans-serif", "serif", "display", "monospace", "script"];

const fontStyles: PhotoStudioFontStyle[] = [
  {
    id: "modern-sans",
    label: "Modern Sans",
    category: "sans-serif",
    sample: "The quick brown fox jumps",
    preview: "Clean and versatile for UI copy",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: 600,
  },
  {
    id: "light-minimal",
    label: "Light Minimal",
    category: "sans-serif",
    sample: "Refined editorial spacing",
    preview: "Refined spacing for captions",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontWeight: 300,
    letterSpacing: "0.06em",
  },
  {
    id: "rounded",
    label: "Soft Rounded",
    category: "sans-serif",
    sample: "Friendly product labels",
    preview: "Friendly tone for product labels",
    fontFamily: "ui-rounded, 'SF Pro Rounded', 'Nunito', sans-serif",
    fontWeight: 700,
  },
  {
    id: "classic-serif",
    label: "Classic Serif",
    category: "serif",
    sample: "Timeless editorial prose",
    preview: "Timeless editorial body text",
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
    fontWeight: 400,
  },
  {
    id: "display-serif",
    label: "Display Serif",
    category: "serif",
    sample: "Elegant headline style",
    preview: "Elegant headlines and titles",
    fontFamily: "Georgia, 'Palatino Linotype', 'Book Antiqua', serif",
    fontWeight: 700,
  },
  {
    id: "bold-headline",
    label: "Bold Headline",
    category: "display",
    sample: "Poster headline",
    preview: "High-impact poster typography",
    fontFamily: "Impact, 'Arial Black', sans-serif",
    fontWeight: 700,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
  {
    id: "condensed",
    label: "Condensed Caps",
    category: "display",
    sample: "Badge label text",
    preview: "Tight tracking for badges",
    fontFamily: "'Arial Narrow', 'Helvetica Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  {
    id: "monospace",
    label: "Code Mono",
    category: "monospace",
    sample: "const canvas = true;",
    preview: "Technical notes and labels",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: 500,
  },
  {
    id: "script",
    label: "Elegant Script",
    category: "script",
    sample: "With love, always",
    preview: "Decorative signatures and quotes",
    fontFamily: "Snell Roundhand, 'Brush Script MT', cursive",
    fontWeight: 400,
    fontStyle: "italic",
  },
  {
    id: "handwritten",
    label: "Casual Script",
    category: "script",
    sample: "Hello there!",
    preview: "Personal, hand-drawn character",
    fontFamily: "Bradley Hand, 'Segoe Print', 'Comic Sans MS', cursive",
    fontWeight: 400,
  },
];

function getFontStyleById(id: PhotoStudioFontStyleId): PhotoStudioFontStyle {
  return fontStyles.find((style) => style.id === id) ?? fontStyles[0];
}

function fontStyleCss(style: PhotoStudioFontStyle): CSSProperties {
  return {
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    letterSpacing: style.letterSpacing,
    textTransform: style.textTransform,
  };
}

function groupFontStylesByCategory(): Array<{ category: FontCategory; styles: PhotoStudioFontStyle[] }> {
  return fontCategoryOrder
    .map((category) => ({
      category,
      styles: fontStyles.filter((style) => style.category === category),
    }))
    .filter((group) => group.styles.length > 0);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function drawSvgElementToContext(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const markup = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImageElement(url);
    ctx.drawImage(image, x, y, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawCheckerboardBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const tile = 20;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#f1f5f9";
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 1) {
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }
}

function buildCanvasFont(style: PhotoStudioFontStyle, fontSize: number): string {
  const weight = style.fontWeight;
  const stylePart = style.fontStyle === "italic" ? "italic " : "";
  const family = style.fontFamily.split(",")[0]?.trim() ?? "sans-serif";
  return `${stylePart}${weight} ${fontSize}px ${family}`;
}

function drawWrappedTextOnContext(
  ctx: CanvasRenderingContext2D,
  content: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const paragraphs = content.split("\n");
  let cursorY = y;
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY, maxWidth);
        cursorY += lineHeight;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) {
      ctx.fillText(line, x, cursorY, maxWidth);
      cursorY += lineHeight;
    }
    if (paragraphs.length > 1) cursorY += lineHeight * 0.15;
  }
}

type PaintPoint = { x: number; y: number };

type BrushSettings = {
  color: string;
  size: number;
  opacity: number;
};

type EraserSettings = {
  size: number;
};

type DrawingToolMode = "none" | "brush" | "eraser";

function getLocalPaintPoint(clientX: number, clientY: number, container: HTMLElement): PaintPoint | null {
  const rect = container.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function interpolatePaintPoints(from: PaintPoint, to: PaintPoint, step: number): PaintPoint[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance <= step) return [to];
  const count = Math.max(1, Math.ceil(distance / step));
  return Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / count;
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
  });
}

function configurePaintContext(ctx: CanvasRenderingContext2D, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.imageSmoothingEnabled = true;
}

function drawBrushDot(ctx: CanvasRenderingContext2D, point: PaintPoint, settings: BrushSettings) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = settings.color;
  ctx.globalAlpha = settings.opacity;
  ctx.beginPath();
  ctx.arc(point.x, point.y, settings.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBrushSegment(
  ctx: CanvasRenderingContext2D,
  from: PaintPoint,
  to: PaintPoint,
  settings: BrushSettings,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = settings.color;
  ctx.globalAlpha = settings.opacity;
  ctx.lineWidth = settings.size;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawEraserDot(ctx: CanvasRenderingContext2D, point: PaintPoint, size: number) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEraserSegment(ctx: CanvasRenderingContext2D, from: PaintPoint, to: PaintPoint, size: number) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

type ShapePixelBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

function getPercentElementBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  rect: { width: number; height: number },
): ShapePixelBounds {
  const left = ((x - width / 2) / 100) * rect.width;
  const right = ((x + width / 2) / 100) * rect.width;
  const top = ((y - height / 2) / 100) * rect.height;
  const bottom = ((y + height / 2) / 100) * rect.height;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function getShapePixelBounds(shape: CanvasShapeElement, rect: { width: number; height: number }): ShapePixelBounds {
  return getPercentElementBounds(shape.x, shape.y, shape.width, shape.height, rect);
}

function viewBoxPointToPixels(vx: number, vy: number, bounds: ShapePixelBounds): PaintPoint {
  return {
    x: bounds.left + (vx / 100) * bounds.width,
    y: bounds.top + (vy / 100) * bounds.height,
  };
}

function shapeStrokePaddingPx(shape: CanvasShapeElement, bounds: ShapePixelBounds): number {
  const scale = Math.min(bounds.width, bounds.height) / 100;
  const strokeScale = shape.shapeType === "line" ? 1.25 : 1;
  return Math.max(2, shape.strokeWidth * strokeScale * scale * 0.6);
}

function shapeHitByEraser(
  shape: CanvasShapeElement,
  center: PaintPoint,
  radius: number,
  rect: { width: number; height: number },
): boolean {
  const bounds = getShapePixelBounds(shape, rect);
  const touchRadius = radius + shapeStrokePaddingPx(shape, bounds);

  if (shape.shapeType === "line") {
    const start = viewBoxPointToPixels(SHAPE_VIEWBOX_INSET, 100 - SHAPE_VIEWBOX_INSET, bounds);
    const end = viewBoxPointToPixels(100 - SHAPE_VIEWBOX_INSET, SHAPE_VIEWBOX_INSET, bounds);
    return (
      distancePointToSegment(center.x, center.y, start.x, start.y, end.x, end.y) <= touchRadius
    );
  }

  if (shape.shapeType === "arrow") {
    const start = viewBoxPointToPixels(SHAPE_VIEWBOX_INSET, 82, bounds);
    const end = viewBoxPointToPixels(78, 22, bounds);
    if (distancePointToSegment(center.x, center.y, start.x, start.y, end.x, end.y) <= touchRadius) {
      return true;
    }
  }

  const closestX = Math.max(bounds.left, Math.min(center.x, bounds.right));
  const closestY = Math.max(bounds.top, Math.min(center.y, bounds.bottom));
  return Math.hypot(center.x - closestX, center.y - closestY) <= touchRadius;
}

function collectEraserSamplePoints(from: PaintPoint, to: PaintPoint, size: number): PaintPoint[] {
  const step = Math.max(1, size / 8);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance <= step) return [from, to];
  const points = interpolatePaintPoints(from, to, step);
  return [from, ...points];
}

type CanvasTextElement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontStyleId: PhotoStudioFontStyleId;
  fontSize: number;
  color: string;
};

function createCanvasText(fontStyleId: PhotoStudioFontStyleId, x: number, y: number): CanvasTextElement {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(92, Math.max(8, y)),
    width: DEFAULT_TEXT_WIDTH,
    height: 10,
    content: "",
    fontStyleId,
    fontSize: DEFAULT_TEXT_FONT_SIZE,
    color: DEFAULT_TEXT_COLOR,
  };
}

function textHitByEraser(
  text: CanvasTextElement,
  center: PaintPoint,
  radius: number,
  rect: { width: number; height: number },
): boolean {
  const bounds = getPercentElementBounds(text.x, text.y, text.width, text.height, rect);
  const closestX = Math.max(bounds.left, Math.min(center.x, bounds.right));
  const closestY = Math.max(bounds.top, Math.min(center.y, bounds.bottom));
  return Math.hypot(center.x - closestX, center.y - closestY) <= radius + 4;
}

function shapeSupportsFill(shapeType: PhotoStudioShapeType): boolean {
  return !isLineLikeShapeType(shapeType) && !isImageShapeType(shapeType);
}

function shapeSupportsFillElement(shape: CanvasShapeElement): boolean {
  return !isImageShapeType(shape.shapeType) && (shapeUsesPathData(shape) || shapeSupportsFill(shape.shapeType));
}

function getShapeViewBoxRect(
  shapeType: PhotoStudioShapeType,
): { x: number; y: number; width: number; height: number } | null {
  switch (shapeType) {
    case "rectangle":
    case "square":
      return {
        x: SHAPE_VIEWBOX_INSET,
        y: SHAPE_VIEWBOX_INSET,
        width: SHAPE_VIEWBOX_SIZE,
        height: SHAPE_VIEWBOX_SIZE,
      };
    default:
      return null;
  }
}

function getMaxCornerRadius(shapeType: PhotoStudioShapeType): number {
  return getMaxShapeCornerRadius(shapeType);
}

function getDefaultShapeSize(shapeType: PhotoStudioShapeType): { width: number; height: number } {
  switch (shapeType) {
    case "rectangle":
      return { width: 28, height: 16 };
    case "square":
      return { width: 18, height: 18 };
    case "circle":
      return { width: 16, height: 16 };
    case "ellipse":
      return { width: 24, height: 14 };
    case "triangle":
      return { width: 18, height: 16 };
    case "line":
      return { width: 22, height: 8 };
    case "curvedLine":
      return { width: 24, height: 14 };
    case "arc":
      return { width: 24, height: 14 };
    case "arrow":
      return { width: 22, height: 10 };
    case "star":
      return { width: 18, height: 18 };
    case "hexagon":
      return { width: 18, height: 18 };
    case "diamond":
      return { width: 14, height: 20 };
    case "image":
      return { width: 55, height: 42 };
    default:
      return { width: 18, height: 18 };
  }
}

function createCanvasImageShape(
  imageUrl: string,
  assetId: string | null,
  label: string,
  x = 50,
  y = 50,
): CanvasShapeElement {
  const size = getDefaultShapeSize("image");
  return ensureShapeDefaults({
    id: `image-${assetId ?? Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    shapeType: "image",
    imageUrl,
    assetId,
    x: Math.min(95, Math.max(5, x)),
    y: Math.min(95, Math.max(5, y)),
    width: size.width,
    height: size.height,
    strokeWidth: 0,
    strokeColor: "transparent",
    fillColor: "#000000",
    fillOpacity: 0,
    rotation: DEFAULT_SHAPE_ROTATION,
    groupId: null,
    cornerRadius: 0,
    label: label.trim() || "Image",
  });
}

function ensureShapeDefaults(shape: CanvasShapeElement): CanvasShapeElement {
  const usesPath = shapeUsesPathData(shape);
  const sideGaps = shapeSupportsSideGaps(shape.shapeType)
    ? normalizeShapeSideGaps(shape.sideGaps)
    : undefined;
  const linePoints = isLineLikeShapeType(shape.shapeType)
    ? normalizeLinePoints(shape.linePoints) ?? getDefaultLinePoints(shape.shapeType)
    : undefined;
  return {
    ...shape,
    shapeType: usesPath ? "path" : shape.shapeType,
    pathData: usesPath ? shape.pathData?.trim() || PATH_LOBE_UP : shape.pathData,
    pathViewBox: shape.pathViewBox,
    pathFillRule:
      shape.pathFillRule ??
      (usesPath &&
      shape.pathViewBox === PATH_CHATGPT_ICON_VIEWBOX &&
      shape.pathData?.trim().startsWith("M14.949")
        ? "evenodd"
        : undefined),
    rotation: shape.rotation ?? DEFAULT_SHAPE_ROTATION,
    groupId: shape.groupId ?? null,
    cornerRadius:
      shape.shapeType === "rectangle" || shape.shapeType === "square"
        ? shape.cornerRadius ?? DEFAULT_SHAPE_CORNER_RADIUS
        : 0,
    sideGaps,
    linePoints,
    imageUrl: shape.imageUrl,
    assetId: shape.assetId ?? null,
  };
}

function createCanvasShape(shapeType: PhotoStudioShapeType, x: number, y: number): CanvasShapeElement {
  const size = getDefaultShapeSize(shapeType);
  const isLine = isLineLikeShapeType(shapeType);
  return {
    id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    shapeType,
    x: Math.min(95, Math.max(5, x)),
    y: Math.min(95, Math.max(5, y)),
    width: size.width,
    height: size.height,
    strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
    strokeColor: DEFAULT_SHAPE_STROKE_COLOR,
    fillColor: isLine ? "transparent" : DEFAULT_SHAPE_FILL_COLOR,
    fillOpacity: isLine ? 0 : DEFAULT_SHAPE_FILL_OPACITY,
    rotation: DEFAULT_SHAPE_ROTATION,
    groupId: null,
    pathData: undefined,
    cornerRadius:
      shapeType === "rectangle" || shapeType === "square" ? DEFAULT_SHAPE_CORNER_RADIUS : 0,
    sideGaps: undefined,
    linePoints: isLineLikeShapeType(shapeType) ? getDefaultLinePoints(shapeType) : undefined,
    label: "",
  };
}

const colorPaletteGroups = photoStudioColorPaletteGroups;
const quickColorSwatches = photoStudioQuickColorSwatches;

function PremiumColorPicker({
  label,
  value,
  onChange,
  density = "full",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  density?: "full" | "compact" | "minimal";
}) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());

  useEffect(() => {
    setHexDraft(value.toUpperCase());
  }, [value]);

  const commitHexDraft = () => {
    const normalized = normalizeHexColor(hexDraft);
    if (normalized) {
      onChange(normalized);
      setHexDraft(normalized.toUpperCase());
      return;
    }
    setHexDraft(value.toUpperCase());
  };

  const swatchButton = (color: string, size: "sm" | "md" = "md") => {
    const selected = hexColorsMatch(value, color);
    const checkOnDark = !isLightHexColor(color);
    return (
      <button
        key={color}
        type="button"
        onClick={() => onChange(getReadableColorInputValue(color))}
        aria-label={`Select color ${color}`}
        aria-pressed={selected}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border border-black/10 shadow-sm transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20/40",
          size === "sm" ? "h-5 w-5" : "h-6 w-6",
          selected && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background scale-110",
        )}
        style={{ background: color }}
      >
        {selected ? (
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              checkOnDark ? "bg-white/10" : "bg-black/15",
            )}
          >
            <Check
              className={cn(
                "drop-shadow",
                checkOnDark ? "text-white" : "text-foreground",
                size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
              )}
              strokeWidth={3}
            />
          </span>
        ) : null}
      </button>
    );
  };

  const colorInputValue = getReadableColorInputValue(value);

  const hiddenColorInput = (
    <input
      ref={colorInputRef}
      type="color"
      value={colorInputValue}
      onChange={(event) => onChange(getReadableColorInputValue(event.target.value))}
      className="sr-only"
      aria-label={`${label} custom picker`}
    />
  );

  if (density === "minimal") {
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-medium text-foreground">{label}</label>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {quickColorSwatches.slice(0, 8).map((color) => swatchButton(color, "sm"))}
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            className="relative h-7 w-7 overflow-hidden rounded-lg ring-1 ring-border/40 transition-transform hover:scale-105"
            style={{ background: colorInputValue }}
            aria-label={`${label} custom color`}
          >
            <span className="absolute inset-0 ring-1 ring-inset ring-black/10" />
          </button>
          {hiddenColorInput}
        </div>
      </div>
    );
  }

  if (density === "compact") {
    return (
      <label className="block space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <div className="overflow-hidden rounded-xl border border-border/35 bg-gradient-to-br from-muted/25 via-background to-background p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-black/10 transition-transform hover:scale-105"
              style={{ background: colorInputValue }}
              aria-label={`${label} custom color`}
            />
            <input
              type="text"
              value={hexDraft}
              onChange={(event) => setHexDraft(event.target.value.toUpperCase())}
              onBlur={commitHexDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitHexDraft();
                }
              }}
              spellCheck={false}
              className="h-8 min-w-0 flex-1 rounded-lg border border-border/40 bg-background/90 px-2 font-mono text-[10px] uppercase tracking-wide text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              aria-label={`${label} hex value`}
            />
            {hiddenColorInput}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickColorSwatches.slice(0, 12).map((color) => swatchButton(color, "sm"))}
          </div>
        </div>
      </label>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold text-foreground">{label}</p>
      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/[0.1] dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-xl shadow-[0_4px_14px_rgba(15,23,42,0.12)] ring-1 ring-black/10 transition-transform hover:scale-[1.03]"
            style={{ background: colorInputValue }}
            aria-label={`${label} custom color`}
          >
            <span className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/10 opacity-80" />
            <span className="absolute inset-x-1 bottom-1 rounded bg-black/35 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
              Pick
            </span>
          </button>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Hex</p>
            <input
              type="text"
              value={hexDraft}
              onChange={(event) => setHexDraft(event.target.value.toUpperCase())}
              onBlur={commitHexDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitHexDraft();
                }
              }}
              spellCheck={false}
              className="h-9 w-full rounded-lg border border-border/40 bg-background/95 px-2.5 font-mono text-xs uppercase tracking-wide text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              aria-label={`${label} hex value`}
            />
          </div>
          {hiddenColorInput}
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-border/30 bg-background/80 p-2">
          <HexColorPicker
            color={colorInputValue}
            onChange={(next) => onChange(getReadableColorInputValue(next))}
            style={{ width: "100%", height: "128px" }}
          />
        </div>

        <div className="mt-3 space-y-2.5 border-t border-border/25 pt-3">
          {colorPaletteGroups.map((group) => (
            <div key={group.name}>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.name}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.swatches.map((color) => swatchButton(color))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShapeColorInput({
  label,
  value,
  onChange,
  density = "full",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  density?: "full" | "compact" | "minimal";
}) {
  return <PremiumColorPicker label={label} value={value} onChange={onChange} density={density} />;
}

function CompactColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return <PremiumColorPicker label={label} value={value} onChange={onChange} density="compact" />;
}

function OptionSegmentedControl<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (id: T) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-semibold text-foreground">{label}</p>
        {hint ? (
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div
        className="grid gap-0.5 rounded-lg bg-muted/35 p-0.5 ring-1 ring-border/30"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label={label}
      >
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={cn(
                "h-8 rounded-md px-2 text-[11px] font-semibold transition-all duration-200",
                selected
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useElementPixelSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 100, height: 100 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function getUniformShapeStrokeWidth(
  strokeWidth: number,
  pixelWidth: number,
  pixelHeight: number,
): number {
  const minDimension = Math.min(pixelWidth, pixelHeight);
  return Math.max(0.75, strokeWidth * (minDimension / 100));
}

function getUniformShapeCornerRadii(
  cornerRadius: number,
  maxCornerRadius: number,
  pixelWidth: number,
  pixelHeight: number,
): { rx: number; ry: number } {
  const minDimension = Math.min(pixelWidth, pixelHeight);
  const clamped = Math.min(maxCornerRadius, Math.max(MIN_SHAPE_CORNER_RADIUS, cornerRadius));
  const cornerPx = clamped * (minDimension / 100);
  const maxRx = SHAPE_VIEWBOX_SIZE / 2;
  return {
    rx: Math.min(maxRx, (cornerPx / pixelWidth) * 100),
    ry: Math.min(maxRx, (cornerPx / pixelHeight) * 100),
  };
}

function CanvasShapePaths({
  shapeType,
  pathData,
  pathViewBox,
  pathFillRule,
  sideGaps,
  linePoints,
  strokeWidth,
  strokeColor,
  fillColor,
  fillOpacity,
  cornerRadius = DEFAULT_SHAPE_CORNER_RADIUS,
  pixelWidth = 100,
  pixelHeight = 100,
}: {
  shapeType: PhotoStudioShapeType;
  pathData?: string;
  pathViewBox?: number;
  pathFillRule?: CanvasShapeElement["pathFillRule"];
  sideGaps?: CanvasShapeElement["sideGaps"];
  linePoints?: CanvasShapeElement["linePoints"];
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  cornerRadius?: number;
  pixelWidth?: number;
  pixelHeight?: number;
}) {
  if (pathData?.trim()) {
    const vb = pathViewBox && pathViewBox > 0 ? pathViewBox : 100;
    return (
      <svg viewBox={`0 0 ${vb} ${vb}`} className="h-full w-full" aria-hidden>
        <path
          d={pathData.trim()}
          fill={fillColor}
          fillRule={pathFillRule ?? "nonzero"}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={getUniformShapeStrokeWidth(strokeWidth, pixelWidth, pixelHeight)}
          vectorEffect="nonScalingStroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  const stroke = strokeColor;
  const fill = fillColor;
  const renderedStrokeWidth = getUniformShapeStrokeWidth(strokeWidth, pixelWidth, pixelHeight);
  const lineStrokeWidth = renderedStrokeWidth;
  const uniformStroke = { vectorEffect: "nonScalingStroke" as const };
  const maxCornerRadius = getMaxCornerRadius(shapeType);
  const rx = shapeSupportsCornerRadius(shapeType)
    ? Math.min(maxCornerRadius, Math.max(MIN_SHAPE_CORNER_RADIUS, cornerRadius))
    : 0;
  const cornerRadii = shapeSupportsCornerRadius(shapeType)
    ? getUniformShapeCornerRadii(cornerRadius, maxCornerRadius, pixelWidth, pixelHeight)
    : { rx, ry: rx };

  switch (shapeType) {
    case "rectangle":
    case "square": {
      const gapPath = buildRectangleWithSideGapsPathD(sideGaps);
      if (gapPath) {
        return (
          <path
            d={gapPath}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={renderedStrokeWidth}
            strokeLinejoin="round"
            {...uniformStroke}
          />
        );
      }
      return (
        <rect
          x={SHAPE_VIEWBOX_INSET}
          y={SHAPE_VIEWBOX_INSET}
          width={SHAPE_VIEWBOX_SIZE}
          height={SHAPE_VIEWBOX_SIZE}
          rx={cornerRadii.rx}
          ry={cornerRadii.ry}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={renderedStrokeWidth}
          {...uniformStroke}
        />
      );
    }
    case "circle":
      return (
        <circle
          cx="50"
          cy="50"
          r={SHAPE_VIEWBOX_SIZE / 2}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={renderedStrokeWidth}
          {...uniformStroke}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx="50"
          cy="50"
          rx={SHAPE_VIEWBOX_SIZE / 2}
          ry={SHAPE_VIEWBOX_SIZE / 2}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={renderedStrokeWidth}
          {...uniformStroke}
        />
      );
    case "triangle":
      return (
        <polygon
          points={`50,${SHAPE_VIEWBOX_INSET} ${100 - SHAPE_VIEWBOX_INSET},${100 - SHAPE_VIEWBOX_INSET} ${SHAPE_VIEWBOX_INSET},${100 - SHAPE_VIEWBOX_INSET}`}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={renderedStrokeWidth}
          strokeLinejoin="round"
          {...uniformStroke}
        />
      );
    case "line":
    case "curvedLine":
    case "arc":
    case "arrow": {
      const previewPoints =
        linePoints ??
        (isLineLikeShapeType(shapeType) ? getDefaultLinePoints(shapeType) : undefined);
      return (
        <path
          d={buildLineLikePreviewPathD(shapeType, previewPoints)}
          fill="none"
          stroke={stroke}
          strokeWidth={lineStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...uniformStroke}
        />
      );
    }
    case "star":
      return (
        <polygon
          points={`50,${SHAPE_VIEWBOX_INSET} 61,36 92,36 67,54 76,${100 - SHAPE_VIEWBOX_INSET} 50,66 24,${100 - SHAPE_VIEWBOX_INSET} 33,54 8,36 39,36`}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={renderedStrokeWidth}
          strokeLinejoin="round"
          {...uniformStroke}
        />
      );
    case "hexagon":
      return (
        <polygon
          points={`50,${SHAPE_VIEWBOX_INSET} ${100 - SHAPE_VIEWBOX_INSET},28 ${100 - SHAPE_VIEWBOX_INSET},72 50,${100 - SHAPE_VIEWBOX_INSET} ${SHAPE_VIEWBOX_INSET},72 ${SHAPE_VIEWBOX_INSET},28`}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={renderedStrokeWidth}
          strokeLinejoin="round"
          {...uniformStroke}
        />
      );
    case "diamond":
      return (
        <polygon
          points={`50,${SHAPE_VIEWBOX_INSET} ${100 - SHAPE_VIEWBOX_INSET},50 50,${100 - SHAPE_VIEWBOX_INSET} ${SHAPE_VIEWBOX_INSET},50`}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={renderedStrokeWidth}
          strokeLinejoin="round"
          {...uniformStroke}
        />
      );
    default:
      return null;
  }
}

function CanvasPaintLayer({
  paintCanvasRef,
  mode,
  eraserPreviewPoint,
  eraserSize,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  paintCanvasRef: RefObject<HTMLCanvasElement | null>;
  mode: DrawingToolMode;
  eraserPreviewPoint: PaintPoint | null;
  eraserSize: number;
  onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
}) {
  const interactive = mode !== "none";

  return (
    <>
      <canvas
        ref={paintCanvasRef}
        className={cn(
          "absolute inset-0 h-full w-full",
          interactive ? "z-[15]" : "z-[8] pointer-events-none",
          interactive && "touch-none",
          mode === "brush" && "cursor-crosshair",
          mode === "eraser" && "cursor-none",
          !interactive && "pointer-events-none",
        )}
        aria-hidden={!interactive}
        onPointerDown={interactive ? onPointerDown : undefined}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive ? onPointerUp : undefined}
        onPointerLeave={interactive ? onPointerUp : undefined}
        onPointerCancel={interactive ? onPointerUp : undefined}
      />

      {mode === "eraser" && eraserPreviewPoint ? (
        <div
          className="pointer-events-none absolute z-[16] rounded-full border border-foreground/40 bg-foreground/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
          style={{
            width: eraserSize,
            height: eraserSize,
            left: eraserPreviewPoint.x - eraserSize / 2,
            top: eraserPreviewPoint.y - eraserSize / 2,
          }}
        />
      ) : null}
    </>
  );
}

function CanvasShapeItem({
  shape,
  selected,
  selectable,
  movable,
  resizable,
  textEditable,
  isEditingText,
  canvasRef,
  onSelect,
  onMove,
  onResize,
  onStartEditText,
  onEndEditText,
  onUpdateLabel,
}: {
  shape: CanvasShapeElement;
  selected: boolean;
  selectable: boolean;
  movable: boolean;
  resizable: boolean;
  textEditable: boolean;
  isEditingText: boolean;
  canvasRef: RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, next: Pick<CanvasShapeElement, "x" | "y" | "width" | "height">) => void;
  onStartEditText: () => void;
  onEndEditText: () => void;
  onUpdateLabel: (id: string, label: string) => void;
}) {
  const [draftLabel, setDraftLabel] = useState(shape.label);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  const pixelSize = useElementPixelSize(shapeRef);
  const canHaveText = shapeSupportsFillElement(shape);

  useEffect(() => {
    if (isEditingText) {
      setDraftLabel(shape.label);
      textInputRef.current?.focus();
      textInputRef.current?.select();
    }
  }, [isEditingText, shape.label]);

  const commitLabel = () => {
    onUpdateLabel(shape.id, draftLabel.trim());
    onEndEditText();
  };

  const cancelLabel = () => {
    setDraftLabel(shape.label);
    onEndEditText();
  };

  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!textEditable || !canHaveText || isEditingText) return;
    event.stopPropagation();
    onSelect();
    onStartEditText();
  };
  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isEditingText) return;

    const canDrag = movable || selectable;
    if (!canDrag) {
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (selectable) {
      onSelect();
    }

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const canvasNode = canvasRef.current;
      if (!canvasNode) return;

      const rect = canvasNode.getBoundingClientRect();
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      onMove(shape.id, x, y);
    };

    const handlePointerUp = () => {
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUp);
      target.removeEventListener("pointercancel", handlePointerUp);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
    target.addEventListener("pointercancel", handlePointerUp);
  };

  const startResize = (handle: ResizeHandle, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const left = shape.x - shape.width / 2;
    const right = shape.x + shape.width / 2;
    const top = shape.y - shape.height / 2;
    const bottom = shape.y + shape.height / 2;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const canvasNode = canvasRef.current;
      if (!canvasNode) return;

      const rect = canvasNode.getBoundingClientRect();
      const pointerX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const pointerY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      let nextLeft = left;
      let nextRight = right;
      let nextTop = top;
      let nextBottom = bottom;

      if (handle.includes("w")) nextLeft = pointerX;
      if (handle.includes("e")) nextRight = pointerX;
      if (handle.includes("n")) nextTop = pointerY;
      if (handle.includes("s")) nextBottom = pointerY;

      if (nextRight - nextLeft < MIN_SHAPE_SIZE) {
        if (handle.includes("w")) nextLeft = nextRight - MIN_SHAPE_SIZE;
        else nextRight = nextLeft + MIN_SHAPE_SIZE;
      }
      if (nextBottom - nextTop < MIN_SHAPE_SIZE) {
        if (handle.includes("n")) nextTop = nextBottom - MIN_SHAPE_SIZE;
        else nextBottom = nextTop + MIN_SHAPE_SIZE;
      }

      nextLeft = Math.max(0, Math.min(nextLeft, 100 - MIN_SHAPE_SIZE));
      nextTop = Math.max(0, Math.min(nextTop, 100 - MIN_SHAPE_SIZE));
      nextRight = Math.max(nextLeft + MIN_SHAPE_SIZE, Math.min(nextRight, 100));
      nextBottom = Math.max(nextTop + MIN_SHAPE_SIZE, Math.min(nextBottom, 100));

      const width = nextRight - nextLeft;
      const height = nextBottom - nextTop;

      onResize(shape.id, {
        x: nextLeft + width / 2,
        y: nextTop + height / 2,
        width,
        height,
      });
    };

    const handlePointerUp = () => {
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUp);
      target.removeEventListener("pointercancel", handlePointerUp);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
    target.addEventListener("pointercancel", handlePointerUp);
  };

  const resizeHandles: Array<{ id: ResizeHandle; className: string }> = [
    { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
    { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
    { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
    { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
    { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
    { id: "s", className: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
    { id: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
    { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
  ];

  return (
    <div
      ref={shapeRef}
      role="img"
      data-canvas-shape=""
      aria-label={shape.label || shape.shapeType}
      onPointerDown={startMove}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "absolute touch-none",
        movable && "cursor-grab active:cursor-grabbing",
        selectable && !movable && !isEditingText && "cursor-pointer",
        textEditable && canHaveText && selected && !isEditingText && "cursor-text",
        selected && "ring-2 ring-primary/40/60 ring-offset-1 rounded-sm",
      )}
      style={{
        left: `${shape.x}%`,
        top: `${shape.y}%`,
        width: `${shape.width}%`,
        height: `${shape.height}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible pointer-events-none"
        aria-hidden
      >
        <CanvasShapePaths
          shapeType={shape.shapeType}
          pathData={shape.pathData}
          pathViewBox={shape.pathViewBox}
          pathFillRule={shape.pathFillRule}
          sideGaps={shape.sideGaps}
          linePoints={shape.linePoints}
          strokeWidth={shape.strokeWidth}
          strokeColor={shape.strokeColor}
          fillColor={shape.fillColor}
          fillOpacity={shape.fillOpacity}
          cornerRadius={shape.cornerRadius}
          pixelWidth={pixelSize.width}
          pixelHeight={pixelSize.height}
        />
      </svg>

      {canHaveText && shape.label && !isEditingText ? (
        <div className="pointer-events-none absolute inset-[12%] z-[5] flex items-center justify-center">
          <p
            className="w-full text-center text-[clamp(7px,1.1em,13px)] font-semibold leading-tight break-words line-clamp-4"
            style={{ color: shape.strokeColor }}
          >
            {shape.label}
          </p>
        </div>
      ) : null}

      {canHaveText && isEditingText ? (
        <textarea
          ref={textInputRef}
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          onBlur={commitLabel}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commitLabel();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelLabel();
            }
          }}
          placeholder="Add text…"
          rows={2}
          className="absolute inset-[10%] z-20 resize-none rounded border border-transparent bg-transparent p-1 text-center text-[clamp(7px,1.1em,13px)] font-semibold leading-tight text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
        />
      ) : null}

      {selected && resizable
        ? resizeHandles.map((handle) => (
            <button
              key={handle.id}
              type="button"
              aria-label={`Resize ${shape.shapeType} from ${handle.id}`}
              onPointerDown={(event) => startResize(handle.id, event)}
              className={cn(
                "absolute z-10 h-2.5 w-2.5 rounded-full border border-primary/40 bg-white shadow-sm",
                handle.className,
              )}
            />
          ))
        : null}
    </div>
  );
}

function FontStyleList({
  activeFontStyleId,
  onSelect,
  expanded = true,
  embedded = false,
}: {
  activeFontStyleId: PhotoStudioFontStyleId;
  onSelect: (id: PhotoStudioFontStyleId) => void;
  expanded?: boolean;
  embedded?: boolean;
}) {
  const groups = groupFontStylesByCategory();

  if (!expanded) {
    return (
      <div className="flex flex-col gap-1">
        {fontStyles.map((style) => {
          const selected = activeFontStyleId === style.id;
          return (
            <WorkspaceTooltip key={style.id} label={style.label} enabled>
              <button
                type="button"
                onClick={() => onSelect(style.id)}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-lg border transition-all duration-200",
                  selected
                    ? "border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/15"
                    : "border-border/30 bg-background/55 text-foreground hover:bg-background",
                )}
                aria-label={style.label}
                aria-pressed={selected}
              >
                <span className="text-base leading-none" style={fontStyleCss(style)}>
                  Ag
                </span>
              </button>
            </WorkspaceTooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4",
        embedded && "max-h-[min(18rem,42vh)] overflow-y-auto pr-0.5 [scrollbar-width:thin]",
      )}
    >
      {groups.map((group, groupIndex) => (
        <section key={group.category} className={cn(groupIndex > 0 && "pt-1")}>
          <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {fontCategoryLabels[group.category]}
          </p>
          <div className="space-y-1.5">
            {group.styles.map((style) => {
              const selected = activeFontStyleId === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onSelect(style.id)}
                  className={cn(
                    "group relative flex w-full flex-col gap-1.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                    selected
                      ? "border-primary/40 bg-foreground/[0.07] shadow-[inset_3px_0_0_0] shadow-primary/30"
                      : "border-border/35 bg-background/60 hover:border-border/60 hover:bg-background",
                  )}
                  aria-label={style.label}
                  aria-pressed={selected}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold tracking-tight text-foreground">
                      {style.label}
                    </span>
                    {selected ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-border/50 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                  <p
                    className="truncate text-[15px] leading-snug text-foreground/90"
                    style={fontStyleCss(style)}
                  >
                    {style.sample}
                  </p>
                  <p className="truncate text-[10px] leading-relaxed text-muted-foreground">
                    {style.preview}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function CanvasTextItem({
  text,
  fontStyle,
  selected,
  selectable,
  movable,
  resizable,
  editable,
  isEditing,
  canvasRef,
  onSelect,
  onMove,
  onResize,
  onStartEdit,
  onEndEdit,
  onUpdateContent,
  onRemoveIfEmpty,
}: {
  text: CanvasTextElement;
  fontStyle: PhotoStudioFontStyle;
  selected: boolean;
  selectable: boolean;
  movable: boolean;
  resizable: boolean;
  editable: boolean;
  isEditing: boolean;
  canvasRef: RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onUpdateContent: (id: string, content: string) => void;
  onRemoveIfEmpty?: (id: string) => void;
}) {
  const [draftContent, setDraftContent] = useState(text.content);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraftContent(text.content);
      textInputRef.current?.focus();
      textInputRef.current?.select();
    }
  }, [isEditing, text.content]);

  const commitContent = () => {
    const trimmed = draftContent.trim();
    if (!trimmed) {
      onRemoveIfEmpty?.(text.id);
      onEndEdit();
      return;
    }
    onUpdateContent(text.id, trimmed);
    onEndEdit();
  };

  const cancelEdit = () => {
    if (!text.content.trim() && !draftContent.trim()) {
      onRemoveIfEmpty?.(text.id);
    } else {
      setDraftContent(text.content);
    }
    onEndEdit();
  };

  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!editable || isEditing) return;
    event.stopPropagation();
    onSelect();
    onStartEdit();
  };

  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isEditing) return;

    const canDrag = movable || selectable;
    if (!canDrag) {
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (selectable) {
      onSelect();
    }

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const canvasNode = canvasRef.current;
      if (!canvasNode) return;
      const rect = canvasNode.getBoundingClientRect();
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      onMove(text.id, x, y);
    };

    const handlePointerUp = () => {
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUp);
      target.removeEventListener("pointercancel", handlePointerUp);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
    target.addEventListener("pointercancel", handlePointerUp);
  };

  const startResize = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const startWidth = text.width;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const canvasNode = canvasRef.current;
      if (!canvasNode) return;
      const rect = canvasNode.getBoundingClientRect();
      const pointerX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const leftEdge = text.x - startWidth / 2;
      const nextWidth = Math.min(MAX_TEXT_WIDTH, Math.max(MIN_TEXT_WIDTH, (pointerX - leftEdge) * 2));
      onResize(text.id, nextWidth);
    };

    const handlePointerUp = () => {
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUp);
      target.removeEventListener("pointercancel", handlePointerUp);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
    target.addEventListener("pointercancel", handlePointerUp);
  };

  const textStyle: CSSProperties = {
    ...fontStyleCss(fontStyle),
    color: text.color,
    fontSize: `clamp(12px, ${text.fontSize * 0.11}cqw, ${text.fontSize}px)`,
  };

  return (
    <div
      role="textbox"
      data-canvas-text=""
      aria-label={text.content}
      onPointerDown={startMove}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "absolute touch-none",
        movable && !isEditing && "cursor-grab active:cursor-grabbing",
        selectable && !movable && !isEditing && "cursor-pointer",
        editable && !isEditing && "cursor-text",
        selected && !isEditing && "ring-2 ring-primary/40 ring-offset-1 rounded-sm",
      )}
      style={{
        left: `${text.x}%`,
        top: `${text.y}%`,
        width: `${text.width}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {isEditing ? (
        <textarea
          ref={textInputRef}
          value={draftContent}
          onChange={(event) => setDraftContent(event.target.value)}
          onBlur={commitContent}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commitContent();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelEdit();
            }
          }}
          placeholder="Add text…"
          rows={2}
          className="w-full resize-none rounded border border-transparent bg-transparent p-1 text-center text-[clamp(12px,1.1em,13px)] font-semibold leading-tight outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          style={textStyle}
        />
      ) : text.content ? (
        <p
          className="w-full whitespace-pre-wrap break-words text-center text-[clamp(12px,1.1em,13px)] font-semibold leading-tight"
          style={textStyle}
        >
          {text.content}
        </p>
      ) : null}

      {selected && resizable ? (
        <button
          type="button"
          aria-label="Resize text width"
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 z-10 h-2.5 w-2.5 translate-x-1/2 translate-y-1/2 rounded-full border border-primary/40 bg-white shadow-sm cursor-ew-resize"
        />
      ) : null}
    </div>
  );
}

const workspaceTools: Array<{ id: WorkspaceTool; label: string; shortcut: string; icon: LucideIcon }> = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "move", label: "Move", shortcut: "M", icon: Move },
  { id: "crop", label: "Crop", shortcut: "C", icon: Crop },
  { id: "brush", label: "Brush", shortcut: "B", icon: Brush },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "shape", label: "Shape", shortcut: "S", icon: Square },
  { id: "eyedropper", label: "Pick", shortcut: "I", icon: Pipette },
  { id: "mask", label: "Mask", shortcut: "K", icon: Lasso },
  { id: "adjust", label: "Adjust", shortcut: "A", icon: SlidersHorizontal },
  { id: "flip", label: "Flip", shortcut: "F", icon: FlipHorizontal2 },
  { id: "rotate", label: "Rotate", shortcut: "R", icon: RotateCw },
  { id: "layers", label: "Layers", shortcut: "L", icon: Layers },
];

const assistTools: Array<{ id: AssistPanel; label: string; description: string; icon: LucideIcon }> = [
  { id: "prompt", label: "Prompt", description: "Describe what to generate", icon: Sparkles },
  { id: "chat", label: "Ask", description: "Chat about your canvas", icon: MessageCircle },
];

const RIGHT_SIDEBAR_COLLAPSED_WIDTH = 72;
const RIGHT_SIDEBAR_DEFAULT_WIDTH = 288;
const RIGHT_SIDEBAR_MIN_WIDTH = 240;
const RIGHT_SIDEBAR_MAX_WIDTH = 480;
const RIGHT_SIDEBAR_WIDTH_STORAGE_KEY = "ps-right-sidebar-width";

function readStoredSidebarWidth(): number {
  if (typeof window === "undefined") return RIGHT_SIDEBAR_DEFAULT_WIDTH;
  const raw = localStorage.getItem(RIGHT_SIDEBAR_WIDTH_STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) return RIGHT_SIDEBAR_DEFAULT_WIDTH;
  return Math.min(RIGHT_SIDEBAR_MAX_WIDTH, Math.max(RIGHT_SIDEBAR_MIN_WIDTH, parsed));
}

function writeStoredSidebarWidth(width: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RIGHT_SIDEBAR_WIDTH_STORAGE_KEY, String(width));
}

function SidebarResizeHandle({
  onDrag,
  onDragEnd,
}: {
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(true);
      let lastX = event.clientX;

      const handleMouseMove: EventListener = (event) => {
        const moveEvent = event as globalThis.MouseEvent;
        onDrag(moveEvent.clientX - lastX);
        lastX = moveEvent.clientX;
      };

      const handleMouseUp = () => {
        setDragging(false);
        onDragEnd();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onDrag, onDragEnd],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute -left-1.5 top-0 z-10 h-full w-3 cursor-col-resize",
        dragging && "bg-primary/10",
      )}
    />
  );
}

type SidebarSectionAccent = keyof typeof accentThemes;

function SidebarCollapsibleSection({
  id,
  title,
  hint,
  icon: Icon,
  open,
  onToggle,
  accent = "neutral",
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  icon?: LucideIcon;
  open: boolean;
  onToggle: () => void;
  accent?: SidebarSectionAccent;
  children: ReactNode;
}) {
  const theme = accentThemes[accent];
  const panelId = `sidebar-section-${id}`;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.15rem] border transition-all duration-200",
        open
          ? "border-black/[0.06] bg-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.04)] ring-1 ring-primary/10 dark:border-white/[0.12] dark:bg-white/[0.04]"
          : "border-black/[0.05] bg-white/40 hover:border-black/[0.08] hover:bg-white/60 dark:border-white/[0.1] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
          open && cn("border-b border-border/25 bg-gradient-to-r", theme.panelHeader),
        )}
      >
        {Icon ? (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200",
              open ? theme.icon : "bg-muted/50 text-muted-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={open ? 2.25 : 2} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[10px] font-semibold uppercase tracking-[0.16em]",
              open ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {title}
          </span>
          {hint && !open ? (
            <span className="mt-0.5 block truncate text-[10px] leading-snug text-muted-foreground/90">
              {hint}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200",
            open && "rotate-180 text-foreground",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="space-y-3 px-3 pb-3 pt-2.5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function WorkspaceTooltip({
  label,
  hint,
  enabled = true,
  children,
}: {
  label: string;
  hint?: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const showTooltip = useCallback(() => {
    if (!enabled) return;
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPosition({ top: rect.top + rect.height / 2, left: rect.left - 10 });
  }, [enabled]);

  const hideTooltip = useCallback(() => setPosition(null), []);

  return (
    <>
      <div
        ref={triggerRef}
        className="relative w-full"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {enabled && position
        ? createPortal(
            <div
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              className="pointer-events-none fixed z-[200] max-w-[14rem] -translate-x-full -translate-y-1/2 rounded-xl border border-border/30 bg-popover px-2.5 py-1.5 backdrop-blur-sm"
            >
              <span className="block text-xs font-semibold text-foreground">{label}</span>
              {hint ? (
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{hint}</span>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function WorkspaceSidebarExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-0 top-1/2 z-20 hidden h-16 w-5 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-border/30 bg-white text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground lg:inline-flex dark:bg-background"
      aria-label="Show assets sidebar"
      title="Show assets sidebar"
    >
      <PanelLeft className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function LauncherPanel({
  label,
  title,
  accent = "neutral",
  children,
}: {
  label: string;
  title: string;
  accent?: keyof typeof accentThemes;
  children: ReactNode;
}) {
  const theme = accentThemes[accent];
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-black/[0.07] bg-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/[0.12] dark:bg-card/80">
      <div
        className={cn(
          "relative border-b border-black/[0.05] bg-gradient-to-r px-5 py-4 dark:border-white/[0.1] md:px-6",
          theme.panelHeader,
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-foreground/10 dark:bg-white/15" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function LauncherOptionCard({
  icon: Icon,
  title,
  description,
  badge,
  accent,
  onClick,
  disabled,
  loading,
  loadingLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  accent: keyof typeof accentThemes;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}) {
  const theme = accentThemes[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group relative flex w-full items-start gap-4 overflow-hidden rounded-[1.25rem] border p-5 text-left transition-all duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        theme.card,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity group-hover:opacity-100",
          theme.glow,
          "opacity-60",
        )}
      />
      <span
        className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105",
          theme.icon,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            {badge ? (
              <span
                className={cn(
                  "mb-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  theme.badge,
                )}
              >
                {badge}
              </span>
            ) : null}
            <span className="block text-[15px] font-semibold tracking-tight text-foreground">
              {loading && loadingLabel ? loadingLabel : title}
            </span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </span>
        <span className="mt-1.5 block text-[13px] leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function PhotoStudioHome({
  recentProjects,
  onOpenRecentProject,
  onDeleteRecentProject,
  formatRecentTime,
}: {
  recentProjects: RecentPhotoProject[];
  onOpenRecentProject?: (project: RecentPhotoProject) => void;
  onDeleteRecentProject?: (project: RecentPhotoProject) => Promise<void>;
  formatRecentTime: (openedAt: number) => string;
}) {
  const [deletingProjectKey, setDeletingProjectKey] = useState<string | null>(null);

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-foreground/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-7">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-black/[0.07] bg-white/80 p-6 shadow-[0_6px_30px_-10px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-white/[0.12] dark:bg-card/80 md:p-8">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-white/[0.12] dark:bg-white/[0.06]">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                Clovai Canvas
              </div>
              <h1 className="brand-text-gradient mt-4 text-3xl font-bold tracking-tight md:text-[2.65rem] md:leading-tight">
                Start creating visuals
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Use <span className="font-semibold text-foreground">More</span> in the header to open
                from your library, upload an image, or import canvas JSON. Pick a recent project
                below, or start a new tab with <span className="font-semibold text-foreground">+</span>.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
              {["Logos", "Product shots", "Campaigns"].map((label) => (
                <span
                  key={label}
                  className="inline-flex rounded-full border border-black/[0.06] bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-black/[0.03] dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-foreground/80 dark:ring-white/[0.06]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <LauncherPanel label="Recent" title="Continue where you left off" accent="neutral">
          {recentProjects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentProjects.slice(0, 6).map((project, index) => {
                const accent = recentAccentKeys[index % recentAccentKeys.length];
                const theme = accentThemes[accent];
                return (
                  <div
                    key={project.key}
                    className={cn(
                      "group relative overflow-hidden rounded-[1.15rem] transition-all duration-300 hover:-translate-y-0.5",
                      theme.card,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenRecentProject?.(project)}
                      disabled={!onOpenRecentProject}
                      className="flex w-full items-start gap-3 px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                          theme.icon,
                        )}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {project.title}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatRecentTime(project.openedAt)}
                          {project.workspaceId
                            ? " · Saved workspace"
                            : project.assetId
                              ? " · Image attached"
                              : " · Blank workspace"}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </button>
                    {project.workspaceId && onDeleteRecentProject ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingProjectKey(project.key);
                          void onDeleteRecentProject(project).finally(() => {
                            setDeletingProjectKey(null);
                          });
                        }}
                        disabled={deletingProjectKey === project.key}
                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 text-muted-foreground opacity-0 shadow-sm transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
                        aria-label={`Delete ${project.title}`}
                      >
                        {deletingProjectKey === project.key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.15rem] border border-dashed border-black/[0.1] bg-white/50 px-5 py-8 text-center dark:border-white/[0.18] dark:bg-white/[0.03]">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                <ImageIcon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">No recent projects yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                Your recent projects will appear here. Use More in the header to open from your
                library or upload an image.
              </p>
            </div>
          )}
        </LauncherPanel>
      </div>
    </div>
  );
}

function mapDesignToSavedCanvasDesign(design: PhotoStudioSavedDesign): SavedCanvasDesign {
  return {
    ...design,
    aspectRatio: isPhotoStudioAspectRatio(design.aspectRatio) ? design.aspectRatio : "1:1",
    shapes: design.shapes as CanvasShapeElement[],
    texts: design.texts as CanvasTextElement[],
  };
}

function PhotoStudioWorkspace({
  assetId,
  assetName,
  assetImageUrl,
  workspaceId,
  workspaceTabId,
  initialWorkspaceSnapshot,
  onWorkspaceSnapshotChange,
  onLoadDesigns,
  onSaveWorkspace,
  isSavingWorkspace = false,
  workspacePersisted = false,
  hasUnsavedWorkspaceChanges = false,
  photoStudioOptions,
  onDeleteGeneration,
  onFetchGeneration,
  generationsLoading = false,
  initialGenerationsFromApi = [],
  onGenerate,
  generating = false,
  assetUploading,
  canvasDraftId = "draft",
  loadExportedCanvasJson,
  onRegisterCanvasFileActions,
  workspaceUploads = [],
  uploadsLoading = false,
  uploadsError,
  onSelectWorkspaceUpload,
  onRefreshWorkspaceUploads,
  onOpenLibrary,
  onUploadImageFile,
}: {
  assetId?: string | null;
  assetName?: string | null;
  assetImageUrl?: string | null;
  workspaceId?: string | null;
  workspaceTabId?: string;
  initialWorkspaceSnapshot?: PhotoStudioWorkspaceSnapshot | null;
  onWorkspaceSnapshotChange?: (snapshot: PhotoStudioWorkspaceSnapshot) => void;
  canvasDraftId?: string;
  loadExportedCanvasJson?: (params: {
    workspaceId: string | null;
    draftId: string;
  }) => Promise<unknown | null>;
  onLoadDesigns?: (
    workspaceId: string | null,
  ) => Promise<{ templates: PhotoStudioSavedDesign[]; saved: PhotoStudioSavedDesign[] }>;
  onSaveWorkspace?: () => void;
  isSavingWorkspace?: boolean;
  workspacePersisted?: boolean;
  hasUnsavedWorkspaceChanges?: boolean;
  photoStudioOptions?: PhotoStudioOptionsConfig;
  onDeleteGeneration?: (id: string) => Promise<void>;
  onFetchGeneration?: (id: string) => Promise<PhotoStudioGeneratedItem>;
  generationsLoading?: boolean;
  initialGenerationsFromApi?: PhotoStudioGeneratedItem[];
  onGenerate?: PhotoStudioAppProps["onGenerate"];
  generating?: boolean;
  assetUploading?: boolean;
  onRegisterCanvasFileActions?: (actions: PhotoStudioCanvasFileActions | null) => void;
  workspaceUploads?: PhotoStudioWorkspaceUpload[];
  uploadsLoading?: boolean;
  uploadsError?: string | null;
  onSelectWorkspaceUpload?: (upload: PhotoStudioWorkspaceUpload) => void;
  onRefreshWorkspaceUploads?: () => void;
  onOpenLibrary?: () => void;
  onUploadImageFile?: (file: File) => void | Promise<void>;
}) {
  const studioOptions = useMemo(() => resolvePhotoStudioOptions(photoStudioOptions), [photoStudioOptions]);
  const creationTypeOptions = useMemo(
    () => buildCreationTypeOptions(studioOptions),
    [studioOptions],
  );
  const aspectRatioPickerOptions = useMemo(
    () => studioOptions.aspectRatios.map((ratio) => ({ id: ratio.id, intent: ratio.hint })),
    [studioOptions],
  );
  const creationTypeLabels = useMemo(
    () => Object.fromEntries(studioOptions.creationTypes.map((type) => [type.id, type.label])),
    [studioOptions],
  );
  const hydratedSessionKeyRef = useRef<string | null>(null);
  const skipSnapshotEmitRef = useRef(false);
  const reloadDesignsRef = useRef<(() => Promise<void>) | null>(null);
  const [prompt, setPrompt] = useState("");
  const [creationType, setCreationType] = useState<PhotoStudioCreationType>("logo");
  const [aspectRatio, setAspectRatio] = useState<PhotoStudioAspectRatio>("1:1");
  const [stylePreset, setStylePreset] = useState("studio");
  const [logoTransparentBackground, setLogoTransparentBackground] = useState(true);
  const [canvasBackgroundId, setCanvasBackgroundId] = useState<CanvasBackgroundId>("warm-paper");
  const [customCanvasBackgroundColor, setCustomCanvasBackgroundColor] = useState(
    DEFAULT_CUSTOM_CANVAS_BACKGROUND,
  );
  const [customCanvasGradientEnd, setCustomCanvasGradientEnd] = useState("#71717a");
  const [customCanvasGradientEnabled, setCustomCanvasGradientEnabled] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>("assets");
  const [assetsPanelOpenSection, setAssetsPanelOpenSection] =
    useState<AssetsPanelSection | null>("background");
  const [projectName, setProjectName] = useState(() => assetName?.trim() ?? "");
  const [isEditingWorkspaceTitle, setIsEditingWorkspaceTitle] = useState(false);
  const [workspaceTitleDraft, setWorkspaceTitleDraft] = useState("");
  const workspaceTitleInputRef = useRef<HTMLInputElement>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);

  const toggleAssetsPanelSection = useCallback((key: AssetsPanelSection) => {
    setAssetsPanelOpenSection((current) => (current === key ? null : key));
  }, []);

  const [activeTool, setActiveTool] = useState<WorkspaceTool>("select");
  const [activeShapeType, setActiveShapeType] = useState<PhotoStudioShapeType>("rectangle");
  const [editToolSubPanel, setEditToolSubPanel] = useState<WorkspaceTool | null>(null);
  const [activeAssistPanel, setActiveAssistPanel] = useState<AssistPanel | null>(null);
  const [canvasShapes, setCanvasShapes] = useState<CanvasShapeElement[]>([]);
  const [canvasTexts, setCanvasTexts] = useState<CanvasTextElement[]>([]);
  const [activeFontStyleId, setActiveFontStyleId] = useState<PhotoStudioFontStyleId>("modern-sans");
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    color: DEFAULT_BRUSH_COLOR,
    size: DEFAULT_BRUSH_SIZE,
    opacity: DEFAULT_BRUSH_OPACITY,
  });
  const [eraserSettings, setEraserSettings] = useState<EraserSettings>({
    size: DEFAULT_BRUSH_SIZE,
  });
  const [eraserPreviewPoint, setEraserPreviewPoint] = useState<PaintPoint | null>(null);
  const [canvasHasEdits, setCanvasHasEdits] = useState(false);
  const paintCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastPaintPointRef = useRef<PaintPoint | null>(null);
  const isPaintingRef = useRef(false);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectionPanelMoreOpen, setSelectionPanelMoreOpen] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<CanvasSelectionBounds | null>(null);
  const selectedShapeId = selectedShapeIds[0] ?? null;
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingShapeTextId, setEditingShapeTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [canvasDragOver, setCanvasDragOver] = useState(false);
  const [shapeDragActive, setShapeDragActive] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const shapeStageRef = useRef<Konva.Stage | null>(null);
  const canvasZoomContentRef = useRef<HTMLDivElement>(null);
  const [canvasZoomContentSize, setCanvasZoomContentSize] = useState({ width: 0, height: 0 });
  const canvasPixelSize = useElementPixelSize(canvasRef);
  const [canvasZoom, setCanvasZoom] = useState(CANVAS_ZOOM_DEFAULT);
  const [rightToolbarExpanded, setRightToolbarExpanded] = useState(true);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(RIGHT_SIDEBAR_DEFAULT_WIDTH);
  const [generatedItems, setGeneratedItems] = useState<PhotoStudioGeneratedItem[]>([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [materializedGenerationId, setMaterializedGenerationId] = useState<string | null>(null);
  const [savedDesigns, setSavedDesigns] = useState<SavedCanvasDesign[]>([]);
  const [designsLoading, setDesignsLoading] = useState(false);
  const [designSearchQuery, setDesignSearchQuery] = useState("");
  const [activeSavedDesignId, setActiveSavedDesignId] = useState<string | null>(null);
  const [localGenerating, setLocalGenerating] = useState(false);
  const [deletingGenerationId, setDeletingGenerationId] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([]);
  const [isExporting, setIsExporting] = useState(false);
  const [canvasImportNotice, setCanvasImportNotice] = useState<string | null>(null);
  const canvasJsonInputRef = useRef<HTMLInputElement>(null);
  const autoLoadedCanvasJsonRef = useRef(false);

  const applyCanvasLayersImport = useCallback((parsed: ParsedCanvasLayers) => {
    setCanvasShapes(structuredClone(parsed.shapes).map(ensureShapeDefaults));
    setCanvasTexts(structuredClone(parsed.texts) as CanvasTextElement[]);
    if (parsed.aspectRatio && isAllowedAspectRatio(parsed.aspectRatio, studioOptions)) {
      setAspectRatio(parsed.aspectRatio as PhotoStudioAspectRatio);
    }
    if (
      parsed.canvasBackgroundId &&
      (parsed.canvasBackgroundId === "custom" ||
        canvasBackgroundPresets.some((preset) => preset.id === parsed.canvasBackgroundId) ||
        parsed.canvasBackgroundId in legacyCanvasSolidColors)
    ) {
      setCanvasBackgroundId(parsed.canvasBackgroundId as CanvasBackgroundId);
    }
    if (parsed.customCanvasBackgroundColor) {
      setCustomCanvasBackgroundColor(parsed.customCanvasBackgroundColor);
    }
    if (parsed.customCanvasGradientEnd) {
      setCustomCanvasGradientEnd(parsed.customCanvasGradientEnd);
    }
    if (parsed.customCanvasGradientEnabled !== undefined) {
      setCustomCanvasGradientEnabled(parsed.customCanvasGradientEnabled);
    }
    if (parsed.projectName?.trim()) {
      setProjectName(parsed.projectName.trim());
    }
    setSelectedGenerationId(null);
    setMaterializedGenerationId(null);
    setActiveSavedDesignId(null);
    clearShapeSelection();
    setSelectedTextId(null);
    setEditingShapeTextId(null);
    setEditingTextId(null);
    setActiveTool("select");
    setEditToolSubPanel(null);
    setCanvasHasEdits(true);
  }, [studioOptions]);

  const restoreCanvasFromJson = useCallback(
    async (source: unknown) => {
      const parsed = parseCanvasLayersJson(source);
      if (!parsed) {
        setCanvasImportNotice("Could not read canvas JSON.");
        return false;
      }
      applyCanvasLayersImport(parsed);
      setCanvasImportNotice("Canvas restored from JSON.");
      return true;
    },
    [applyCanvasLayersImport],
  );

  const handleRestoreExportedCanvasJson = useCallback(async () => {
    if (!loadExportedCanvasJson) {
      setCanvasImportNotice("Canvas export API is not configured.");
      return;
    }
    const data = await loadExportedCanvasJson({
      workspaceId: workspaceId ?? null,
      draftId: canvasDraftId,
    });
    if (!data) {
      setCanvasImportNotice("No saved canvas JSON found yet. Draw a shape first.");
      return;
    }
    await restoreCanvasFromJson(data);
  }, [canvasDraftId, loadExportedCanvasJson, restoreCanvasFromJson, workspaceId]);

  const handleCanvasJsonFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        await restoreCanvasFromJson(text);
      } catch {
        setCanvasImportNotice("Failed to read the JSON file.");
      }
    },
    [restoreCanvasFromJson],
  );

  useEffect(() => {
    if (!loadExportedCanvasJson || autoLoadedCanvasJsonRef.current) return;
    const snapshot = initialWorkspaceSnapshot;
    const hasRestoredSnapshot =
      Boolean(snapshot) &&
      ((snapshot?.canvasShapes.length ?? 0) > 0 || (snapshot?.canvasTexts.length ?? 0) > 0);
    if (hasRestoredSnapshot) {
      autoLoadedCanvasJsonRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      void loadExportedCanvasJson({
        workspaceId: workspaceId ?? null,
        draftId: canvasDraftId,
      }).then((data) => {
        if (!data) return;
        const parsed = parseCanvasLayersJson(data);
        if (!parsed || (parsed.shapes.length === 0 && parsed.texts.length === 0)) return;
        applyCanvasLayersImport(parsed);
        autoLoadedCanvasJsonRef.current = true;
        setCanvasImportNotice("Restored your last canvas export.");
      });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    applyCanvasLayersImport,
    canvasDraftId,
    initialWorkspaceSnapshot,
    loadExportedCanvasJson,
    workspaceId,
  ]);

  useEffect(() => {
    if (!canvasImportNotice) return;
    const timer = window.setTimeout(() => setCanvasImportNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [canvasImportNotice]);

  useEffect(() => {
    if (!onRegisterCanvasFileActions) return;
    onRegisterCanvasFileActions({
      openCanvasJsonFile: () => canvasJsonInputRef.current?.click(),
      restoreExportedCanvasJson: handleRestoreExportedCanvasJson,
    });
    return () => onRegisterCanvasFileActions(null);
  }, [handleRestoreExportedCanvasJson, onRegisterCanvasFileActions]);

  useEffect(() => {
    if (!workspaceTabId || !initialWorkspaceSnapshot) return;

    const sessionKey = `${workspaceTabId}:${workspaceId ?? "draft"}`;
    if (hydratedSessionKeyRef.current === sessionKey) return;

    const snapshot = initialWorkspaceSnapshot;
    skipSnapshotEmitRef.current = true;
    setCreationType(snapshot.creationType);
    if (isAllowedAspectRatio(snapshot.aspectRatio, studioOptions)) {
      setAspectRatio(snapshot.aspectRatio as PhotoStudioAspectRatio);
    }
    setStylePreset(snapshot.stylePreset);
    setLogoTransparentBackground(snapshot.logoTransparentBackground);
    setCanvasBackgroundId(snapshot.canvasBackgroundId);
    setCustomCanvasBackgroundColor(snapshot.customCanvasBackgroundColor);
    setCustomCanvasGradientEnd(snapshot.customCanvasGradientEnd);
    setCustomCanvasGradientEnabled(snapshot.customCanvasGradientEnabled);
    setProjectName(snapshot.projectName);
    setCanvasShapes(structuredClone(snapshot.canvasShapes).map(ensureShapeDefaults));
    setCanvasTexts(structuredClone(snapshot.canvasTexts));
    setGeneratedItems(structuredClone(snapshot.generatedItems));
    setSelectedGenerationId(snapshot.selectedGenerationId);
    setMaterializedGenerationId(snapshot.materializedGenerationId);
    setCanvasHasEdits(
      snapshot.canvasShapes.length > 0 || snapshot.canvasTexts.length > 0,
    );
    hydratedSessionKeyRef.current = sessionKey;
    requestAnimationFrame(() => {
      skipSnapshotEmitRef.current = false;
    });
  }, [workspaceTabId, workspaceId, initialWorkspaceSnapshot, studioOptions]);

  useEffect(() => {
    if (!initialGenerationsFromApi.length) return;
    setGeneratedItems((current) => {
      const merged = new Map<string, PhotoStudioGeneratedItem>();
      for (const item of [...initialGenerationsFromApi, ...current]) {
        merged.set(item.id, item);
      }
      return Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
    });
  }, [initialGenerationsFromApi]);

  useEffect(() => {
    if (!onLoadDesigns) return;

    let cancelled = false;

    const loadDesigns = async () => {
      setDesignsLoading(true);
      try {
        const result = await onLoadDesigns(workspaceId ?? null);
        if (cancelled) return;
        setSavedDesigns([
          ...result.templates.map(mapDesignToSavedCanvasDesign),
          ...result.saved.map(mapDesignToSavedCanvasDesign),
        ]);
      } catch {
        if (!cancelled) setSavedDesigns([]);
      } finally {
        if (!cancelled) setDesignsLoading(false);
      }
    };

    reloadDesignsRef.current = loadDesigns;

    if (leftPanelTab === "designs") {
      void loadDesigns();
    }

    return () => {
      cancelled = true;
    };
  }, [leftPanelTab, onLoadDesigns, workspaceId]);

  useEffect(() => {
    if (leftPanelTab !== "uploads") return;
    onRefreshWorkspaceUploads?.();
  }, [leftPanelTab, onRefreshWorkspaceUploads]);

  const handleCanvasZoomIn = useCallback(() => {
    setCanvasZoom((current) => clampCanvasZoom(current + CANVAS_ZOOM_STEP));
  }, []);

  const handleCanvasZoomOut = useCallback(() => {
    setCanvasZoom((current) => clampCanvasZoom(current - CANVAS_ZOOM_STEP));
  }, []);

  const handleCanvasZoomReset = useCallback(() => {
    setCanvasZoom(CANVAS_ZOOM_DEFAULT);
  }, []);

  const workspaceTitle = projectName.trim() || "Untitled project";
  const hasAsset = Boolean(assetId);

  const beginWorkspaceTitleEdit = useCallback(() => {
    setWorkspaceTitleDraft(projectName.trim());
    setIsEditingWorkspaceTitle(true);
  }, [projectName]);

  const commitWorkspaceTitleEdit = useCallback(() => {
    setProjectName(workspaceTitleDraft.trim());
    setIsEditingWorkspaceTitle(false);
  }, [workspaceTitleDraft]);

  const cancelWorkspaceTitleEdit = useCallback(() => {
    setIsEditingWorkspaceTitle(false);
  }, []);

  useEffect(() => {
    if (!isEditingWorkspaceTitle) return;
    workspaceTitleInputRef.current?.focus();
    workspaceTitleInputRef.current?.select();
  }, [isEditingWorkspaceTitle]);
  const isGenerating = generating || localGenerating;

  useEffect(() => {
    if (!onWorkspaceSnapshotChange || skipSnapshotEmitRef.current) return;
    onWorkspaceSnapshotChange({
      title: workspaceTitle,
      assetId: assetId ?? null,
      assetName: assetName ?? null,
      aspectRatio,
      creationType,
      stylePreset,
      logoTransparentBackground,
      canvasBackgroundId,
      customCanvasBackgroundColor,
      customCanvasGradientEnd,
      customCanvasGradientEnabled,
      projectName,
      canvasShapes,
      canvasTexts,
      generatedItems,
      savedDesigns: savedDesigns.filter((design) => design.source === "user"),
      selectedGenerationId,
      materializedGenerationId,
    });
  }, [
    onWorkspaceSnapshotChange,
    workspaceTitle,
    assetId,
    assetName,
    aspectRatio,
    creationType,
    stylePreset,
    logoTransparentBackground,
    canvasBackgroundId,
    customCanvasBackgroundColor,
    customCanvasGradientEnd,
    customCanvasGradientEnabled,
    projectName,
    canvasShapes,
    canvasTexts,
    generatedItems,
    savedDesigns,
    selectedGenerationId,
    materializedGenerationId,
  ]);

  const selectedGeneration =
    generatedItems.find((item) => item.id === selectedGenerationId) ?? null;
  const selectedShape = canvasShapes.find((shape) => shape.id === selectedShapeId) ?? null;
  const selectedShapes = canvasShapes.filter((shape) => selectedShapeIds.includes(shape.id));
  const selectedText = canvasTexts.find((text) => text.id === selectedTextId) ?? null;

  const resolveShapeSelection = useCallback(
    (id: string) => {
      const shape = canvasShapes.find((item) => item.id === id);
      if (!shape?.groupId) return [id];
      return canvasShapes.filter((item) => item.groupId === shape.groupId).map((item) => item.id);
    },
    [canvasShapes],
  );

  const selectCanvasShape = useCallback(
    (id: string, additive: boolean) => {
      const members = resolveShapeSelection(id);
      setSelectedShapeIds((current) => {
        if (additive) {
          const next = new Set(current);
          const allSelected = members.every((memberId) => next.has(memberId));
          for (const memberId of members) {
            if (allSelected) next.delete(memberId);
            else next.add(memberId);
          }
          return Array.from(next);
        }
        return members;
      });
      setSelectedTextId(null);
      setEditingTextId(null);
      setEditingShapeTextId((current) => (current !== null && current !== id ? null : current));
    },
    [resolveShapeSelection],
  );

  const clearShapeSelection = useCallback(() => {
    setSelectedShapeIds([]);
    setEditingShapeTextId(null);
    setSelectionPanelMoreOpen(false);
    setSelectionBounds(null);
  }, []);

  const groupSelectedShapes = useCallback(() => {
    if (selectedShapeIds.length < 2) return;
    const groupId = `grp-${Date.now()}`;
    const ids = new Set(selectedShapeIds);
    setCanvasShapes((current) =>
      current.map((shape) => (ids.has(shape.id) ? { ...shape, groupId } : shape)),
    );
  }, [selectedShapeIds]);

  const ungroupSelectedShapes = useCallback(() => {
    if (selectedShapeIds.length === 0) return;
    const idsToUngroup = new Set<string>();
    for (const id of selectedShapeIds) {
      const shape = canvasShapes.find((item) => item.id === id);
      if (shape?.groupId) {
        canvasShapes
          .filter((item) => item.groupId === shape.groupId)
          .forEach((item) => idsToUngroup.add(item.id));
      } else {
        idsToUngroup.add(id);
      }
    }
    setCanvasShapes((current) =>
      current.map((shape) =>
        idsToUngroup.has(shape.id) ? { ...shape, groupId: null } : shape,
      ),
    );
  }, [canvasShapes, selectedShapeIds]);

  const duplicateSelectedShapes = useCallback(() => {
    if (selectedShapeIds.length === 0) return;

    const sourceIds = new Set<string>();
    for (const id of selectedShapeIds) {
      for (const memberId of resolveShapeSelection(id)) {
        sourceIds.add(memberId);
      }
    }

    const sources = canvasShapes.filter((shape) => sourceIds.has(shape.id));
    if (sources.length === 0) return;

    const existingGroupId = sources[0].groupId;
    const allShareGroup =
      Boolean(existingGroupId) && sources.every((shape) => shape.groupId === existingGroupId);
    const nextGroupId =
      allShareGroup || sources.length > 1 ? `grp-${Date.now()}` : null;
    const offset = 4;
    const stamp = Date.now();

    const duplicates = sources.map((shape, index) =>
      ensureShapeDefaults({
        ...shape,
        id: `shape-${stamp}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        x: Math.min(95, Math.max(5, shape.x + offset)),
        y: Math.min(95, Math.max(5, shape.y + offset)),
        groupId: nextGroupId,
      }),
    );

    setCanvasShapes((current) => [...current, ...duplicates]);
    setSelectedShapeIds(duplicates.map((shape) => shape.id));
    setSelectedTextId(null);
    setEditingShapeTextId(null);
  }, [canvasShapes, resolveShapeSelection, selectedShapeIds]);
  const manualCanvasLayers = useMemo((): CanvasLayerListItem[] => {
    const shapeLayers = canvasShapes
      .filter((shape) => !isGenerationLayerId(shape.id))
      .map((shape) => ({
        id: shape.id,
        kind: "shape" as const,
        label:
          shape.label ||
          (shape.shapeType === "image"
            ? "Image"
            : shapeTypes.find((item) => item.id === shape.shapeType)?.label || "Shape"),
        color: shape.strokeColor,
        shapeType: shape.shapeType,
      }));
    const textLayers = canvasTexts
      .filter((text) => !isGenerationLayerId(text.id))
      .map((text) => ({
        id: text.id,
        kind: "text" as const,
        label: text.content || "Text",
        color: text.color,
      }));
    return [...shapeLayers.slice().reverse(), ...textLayers.slice().reverse()];
  }, [canvasShapes, canvasTexts]);
  const manualLayerCount = manualCanvasLayers.length;
  const canvasAspectRatio = aspectRatio;
  const canvasDesign = getCanvasDesignByAspectRatio(canvasAspectRatio);

  useLayoutEffect(() => {
    const node = canvasZoomContentRef.current;
    if (!node) return;

    const update = () => {
      setCanvasZoomContentSize({
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [canvasAspectRatio]);

  const applyGenerationToCanvas = useCallback(
    async (item: PhotoStudioGeneratedItem) => {
      let resolved = item;
      if (onFetchGeneration) {
        try {
          resolved = await onFetchGeneration(item.id);
        } catch {
          resolved = item;
        }
      }

      setSelectedGenerationId(resolved.id);
      if (isAllowedAspectRatio(resolved.aspectRatio, studioOptions)) {
        setAspectRatio(resolved.aspectRatio as PhotoStudioAspectRatio);
      }
      if (resolved.canvasBackgroundId) {
        setCanvasBackgroundId(resolved.canvasBackgroundId);
      } else if (!resolved.transparentBackground) {
        setCanvasBackgroundId(
          defaultCanvasBackgroundIds[(resolved.variantIndex ?? 0) % defaultCanvasBackgroundIds.length],
        );
      }

      if (materializedGenerationId !== resolved.id) {
        const { shapes, texts } = buildLayersFromGeneration(resolved);
        setCanvasShapes((current) => [
          ...current.filter((shape) => !isGenerationLayerId(shape.id)),
          ...shapes,
        ]);
        setCanvasTexts((current) => [
          ...current.filter((text) => !isGenerationLayerId(text.id)),
          ...texts,
        ]);
        setMaterializedGenerationId(resolved.id);
        setSelectedShapeIds(shapes.length > 0 ? shapes.map((shape) => shape.id) : []);
        setSelectedTextId(null);
        setEditingShapeTextId(null);
        setEditingTextId(null);
        setActiveTool("select");
        setEditToolSubPanel(null);
      }

      setCanvasHasEdits(true);
    },
    [materializedGenerationId, onFetchGeneration, studioOptions],
  );

  const handleDeleteGenerationItem = useCallback(
    async (id: string) => {
      if (!onDeleteGeneration) return;
      setDeletingGenerationId(id);
      try {
        await onDeleteGeneration(id);
        setGeneratedItems((current) => current.filter((item) => item.id !== id));
        if (selectedGenerationId === id) {
          setSelectedGenerationId(null);
        }
        if (materializedGenerationId === id) {
          setMaterializedGenerationId(null);
          setCanvasShapes((current) => current.filter((shape) => !isGenerationLayerId(shape.id)));
          setCanvasTexts((current) => current.filter((text) => !isGenerationLayerId(text.id)));
        }
      } finally {
        setDeletingGenerationId(null);
      }
    },
    [materializedGenerationId, onDeleteGeneration, selectedGenerationId],
  );

  const saveCurrentDesign = useCallback(() => {
    const manualShapes = canvasShapes.filter((shape) => !isGenerationLayerId(shape.id));
    const manualTexts = canvasTexts.filter((text) => !isGenerationLayerId(text.id));
    if (manualShapes.length === 0 && manualTexts.length === 0) return;

    const design: SavedCanvasDesign = {
      id: `design-${Date.now()}`,
      title: projectName.trim() || `Design ${savedDesigns.length + 1}`,
      aspectRatio,
      canvasBackgroundId,
      shapes: structuredClone(manualShapes),
      texts: structuredClone(manualTexts),
      createdAt: Date.now(),
      source: "user",
    };

    setSavedDesigns((current) => [design, ...current]);
    setActiveSavedDesignId(design.id);
    setLeftPanelTab("designs");
    void reloadDesignsRef.current?.();
  }, [aspectRatio, canvasBackgroundId, canvasShapes, canvasTexts, projectName, savedDesigns.length]);

  const loadSavedDesign = useCallback((design: SavedCanvasDesign) => {
    setAspectRatio(design.aspectRatio);
    setCanvasBackgroundId(design.canvasBackgroundId);
    setCanvasShapes(structuredClone(design.shapes).map(ensureShapeDefaults));
    setCanvasTexts(structuredClone(design.texts));
    setSelectedGenerationId(null);
    setMaterializedGenerationId(null);
    setActiveSavedDesignId(design.id);
    clearShapeSelection();
    setSelectedTextId(null);
    setEditingShapeTextId(null);
    setEditingTextId(null);
    setActiveTool("select");
    setEditToolSubPanel(null);
    setCanvasHasEdits(true);
  }, []);

  const deleteSavedDesign = useCallback((id: string) => {
    setSavedDesigns((current) => {
      const target = current.find((design) => design.id === id);
      if (!target || target.source === "system") return current;
      return current.filter((design) => design.id !== id);
    });
    setActiveSavedDesignId((current) => (current === id ? null : current));
  }, []);

  const selectCanvasLayer = useCallback((layer: CanvasLayerListItem) => {
    if (layer.kind === "shape") {
      setSelectedShapeIds([layer.id]);
      setSelectedTextId(null);
      setEditingShapeTextId(null);
      setEditingTextId(null);
    } else {
      setSelectedTextId(layer.id);
      clearShapeSelection();
      setEditingShapeTextId(null);
      setEditingTextId(null);
    }
    setActiveTool("select");
    setEditToolSubPanel(null);
    setLeftPanelTab("designs");
  }, []);

  useEffect(() => {
    if (!assetName?.trim()) return;
    setProjectName((current) => current.trim() || assetName.trim());
  }, [assetName]);

  useEffect(() => {
    setRightSidebarWidth(readStoredSidebarWidth());
  }, []);

  useEffect(() => {
    const container = canvasRef.current;
    const paintCanvas = paintCanvasRef.current;
    if (!container || !paintCanvas) return;

    const resizePaintCanvas = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const snapshot = document.createElement("canvas");
      snapshot.width = paintCanvas.width;
      snapshot.height = paintCanvas.height;
      const snapshotCtx = snapshot.getContext("2d");
      if (snapshotCtx && paintCanvas.width > 0 && paintCanvas.height > 0) {
        snapshotCtx.drawImage(paintCanvas, 0, 0);
      }

      paintCanvas.width = Math.floor(rect.width * dpr);
      paintCanvas.height = Math.floor(rect.height * dpr);
      paintCanvas.style.width = `${rect.width}px`;
      paintCanvas.style.height = `${rect.height}px`;

      const ctx = paintCanvas.getContext("2d");
      if (!ctx) return;
      configurePaintContext(ctx, dpr);

      if (snapshot.width > 0 && snapshot.height > 0) {
        ctx.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, rect.width, rect.height);
      }
    };

    const observer = new ResizeObserver(resizePaintCanvas);
    observer.observe(container);
    resizePaintCanvas();
    return () => observer.disconnect();
  }, [canvasAspectRatio, selectedGenerationId]);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    setLocalGenerating(true);
    try {
      const input = {
        prompt: trimmed,
        creationType,
        aspectRatio,
        stylePreset,
        transparentBackground: creationType === "logo" ? logoTransparentBackground : undefined,
      };
      const result = await onGenerate?.(input);
      if (!Array.isArray(result) || result.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
      const newItems =
        Array.isArray(result) && result.length > 0
          ? result
          : createGenerationBatch(input, studioOptions.batchSize);

      setGeneratedItems((current) => [...newItems, ...current]);
      if (newItems[0]) {
        void applyGenerationToCanvas(newItems[0]);
      }
      setLeftPanelTab("generations");
    } finally {
      setLocalGenerating(false);
    }
  };

  const handleRightSidebarResize = useCallback((deltaX: number) => {
    setRightSidebarWidth((current) =>
      Math.min(RIGHT_SIDEBAR_MAX_WIDTH, Math.max(RIGHT_SIDEBAR_MIN_WIDTH, current - deltaX)),
    );
  }, []);

  const handleRightSidebarResizeEnd = useCallback(() => {
    setRightSidebarWidth((current) => {
      writeStoredSidebarWidth(current);
      return current;
    });
  }, []);

  const toggleRightToolbar = useCallback(() => {
    setRightToolbarExpanded((current) => {
      if (current) setActiveAssistPanel(null);
      return !current;
    });
  }, []);

  const openAssistPanel = (panel: AssistPanel) => {
    setActiveAssistPanel((current) => (current === panel ? null : panel));
    setRightToolbarExpanded(true);
  };

  const focusSelectionToolbar = useCallback(() => {
    setActiveAssistPanel(null);
    setRightToolbarExpanded(true);
  }, []);

  const placeUploadOnCanvas = useCallback(
    (upload: PhotoStudioWorkspaceUpload, position?: { x: number; y: number }) => {
      const imageUrl = upload.imageUrl?.trim();
      if (!imageUrl) return;

      const existing = canvasShapes.find(
        (shape) =>
          shape.shapeType === "image" &&
          (shape.assetId === upload.id || shape.imageUrl === imageUrl),
      );
      if (existing) {
        setSelectedShapeIds([existing.id]);
        setSelectedTextId(null);
        setEditingShapeTextId(null);
        setEditingTextId(null);
        setActiveTool("select");
        setEditToolSubPanel(null);
        focusSelectionToolbar();
        return;
      }

      const newShape = createCanvasImageShape(
        imageUrl,
        upload.id,
        upload.name,
        position?.x,
        position?.y,
      );
      setCanvasShapes((current) => [...current, newShape]);
      setSelectedShapeIds([newShape.id]);
      setSelectedTextId(null);
      setEditingShapeTextId(null);
      setEditingTextId(null);
      setActiveTool("select");
      setEditToolSubPanel(null);
      setCanvasHasEdits(true);
      focusSelectionToolbar();
    },
    [canvasShapes, focusSelectionToolbar],
  );

  const handleSelectWorkspaceUpload = useCallback(
    (upload: PhotoStudioWorkspaceUpload) => {
      placeUploadOnCanvas(upload);
      onSelectWorkspaceUpload?.(upload);
    },
    [onSelectWorkspaceUpload, placeUploadOnCanvas],
  );

  const selectWorkspaceTool = (tool: WorkspaceTool) => {
    setActiveTool(tool);
    setActiveAssistPanel(null);
    if (tool !== "select" && tool !== "shape") {
      clearShapeSelection();
      setSelectedTextId(null);
      setEditingShapeTextId(null);
      setEditingTextId(null);
    }
    if (tool !== "eraser") {
      setEraserPreviewPoint(null);
      isPaintingRef.current = false;
      lastPaintPointRef.current = null;
    }
    if (tool === "shape") {
      setEditToolSubPanel("shape");
      setRightToolbarExpanded(true);
    } else if (tool === "text") {
      setEditToolSubPanel("text");
      setRightToolbarExpanded(true);
    } else {
      setEditToolSubPanel(null);
    }
    if (tool === "brush" || tool === "eraser") {
      setRightToolbarExpanded(true);
    }
  };

  const closeEditToolSubPanel = () => {
    setEditToolSubPanel(null);
  };

  const handleShapeDragStart = (event: DragEvent<HTMLButtonElement>, shapeType: PhotoStudioShapeType) => {
    event.dataTransfer.setData(SHAPE_DRAG_MIME, shapeType);
    event.dataTransfer.setData("text/plain", shapeType);
    event.dataTransfer.effectAllowed = "copy";
    setActiveShapeType(shapeType);
    setShapeDragActive(true);
  };

  const handleShapeDragEnd = () => {
    setShapeDragActive(false);
    setCanvasDragOver(false);
  };

  const handleCanvasDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (
      !event.dataTransfer.types.includes(SHAPE_DRAG_MIME) &&
      !event.dataTransfer.types.includes("text/plain")
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setCanvasDragOver(true);
  };

  const handleCanvasDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !canvasRef.current?.contains(nextTarget)) {
      setCanvasDragOver(false);
    }
  };

  const handleCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setCanvasDragOver(false);
    setShapeDragActive(false);
    const shapeType = (event.dataTransfer.getData(SHAPE_DRAG_MIME) ||
      event.dataTransfer.getData("text/plain")) as PhotoStudioShapeType;
    if (!shapeTypes.some((shape) => shape.id === shapeType) || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = ((event.clientX - rect.left) / rect.width) * 100;
    const dropY = ((event.clientY - rect.top) / rect.height) * 100;
    const { x, y } = snapShapeCenterPercents(dropX, dropY);
    const newShape = createCanvasShape(shapeType, x, y);
    setCanvasShapes((current) => [...current, newShape]);
    setSelectedShapeIds([newShape.id]);
    setSelectedTextId(null);
    setEditingShapeTextId(null);
    setEditingTextId(null);
    setActiveTool("shape");
    setEditToolSubPanel("shape");
    setRightToolbarExpanded(true);
    setCanvasHasEdits(true);
  };

  const updateLinePointsShape = (
    id: string,
    patch: Partial<Pick<CanvasShapeElement, "x" | "y" | "width" | "height" | "linePoints">>,
  ) => {
    setCanvasShapes((current) =>
      current.map((shape) => {
        if (shape.id !== id) return shape;
        return {
          ...shape,
          ...patch,
          linePoints:
            patch.linePoints !== undefined ? patch.linePoints : shape.linePoints,
        };
      }),
    );
  };

  const transformCanvasShape = (id: string, patch: ShapeTransformPatch) => {
    setCanvasShapes((current) =>
      current.map((shape) =>
        shape.id === id
          ? {
              ...shape,
              ...patch,
              rotation:
                patch.rotation !== undefined
                  ? normalizeShapeRotation(patch.rotation)
                  : shape.rotation ?? DEFAULT_SHAPE_ROTATION,
            }
          : shape,
      ),
    );
  };

  const updateShapeStrokeWidth = (id: string, strokeWidth: number) => {
    const clamped = Math.min(MAX_SHAPE_STROKE_WIDTH, Math.max(MIN_SHAPE_STROKE_WIDTH, strokeWidth));
    setCanvasShapes((current) =>
      current.map((shape) => (shape.id === id ? { ...shape, strokeWidth: clamped } : shape)),
    );
  };

  const updateShapeSideGap = (
    id: string,
    side: ShapeSide,
    gap: SideGapConfig | null,
  ) => {
    setCanvasShapes((current) =>
      current.map((shape) => {
        if (shape.id !== id || !shapeSupportsSideGaps(shape.shapeType)) return shape;
        const nextGaps = { ...(shape.sideGaps ?? {}) };
        if (gap) {
          nextGaps[side] = gap;
        } else {
          delete nextGaps[side];
        }
        const sideGaps = normalizeShapeSideGaps(nextGaps);
        return { ...shape, sideGaps };
      }),
    );
  };

  const updateShapeCornerRadius = (cornerRadius: number) => {
    const targetIds = new Set(
      selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [],
    );
    setCanvasShapes((current) =>
      current.map((shape) => {
        if (!targetIds.has(shape.id) || !shapeSupportsCornerRadius(shape.shapeType)) return shape;
        const maxRadius = getMaxCornerRadius(shape.shapeType);
        const clamped = Math.min(maxRadius, Math.max(MIN_SHAPE_CORNER_RADIUS, cornerRadius));
        return { ...shape, cornerRadius: clamped };
      }),
    );
  };

  const updateShapeRotation = (rotation: number) => {
    const targetIds = new Set(
      selectedShapeIds.length > 0 ? selectedShapeIds : selectedShapeId ? [selectedShapeId] : [],
    );
    const normalized = normalizeShapeRotation(rotation);
    setCanvasShapes((current) =>
      current.map((shape) =>
        targetIds.has(shape.id) ? { ...shape, rotation: normalized } : shape,
      ),
    );
  };

  const getActiveShapeColorTargetIds = (): Set<string> =>
    new Set(
      selectedShapeIds.length > 0
        ? selectedShapeIds
        : selectedShapeId
          ? [selectedShapeId]
          : [],
    );

  const updateShapeColors = (
    id: string,
    next: Partial<Pick<CanvasShapeElement, "strokeColor" | "fillColor" | "fillOpacity">>,
  ) => {
    const targetIds = getActiveShapeColorTargetIds();
    const applyTo = targetIds.size > 1 && targetIds.has(id) ? targetIds : new Set([id]);
    setCanvasShapes((current) =>
      current.map((shape) => {
        if (!applyTo.has(shape.id)) return shape;
        const strokeColor = next.strokeColor
          ? normalizeHexColor(next.strokeColor) ?? next.strokeColor
          : shape.strokeColor;
        const fillColor = next.fillColor
          ? normalizeHexColor(next.fillColor) ?? next.fillColor
          : shape.fillColor;
        return {
          ...shape,
          ...next,
          strokeColor,
          fillColor,
        };
      }),
    );
  };

  const updateShapeLabel = (id: string, label: string) => {
    setCanvasShapes((current) =>
      current.map((shape) => (shape.id === id ? { ...shape, label } : shape)),
    );
  };

  const updateTextContent = (id: string, content: string) => {
    setCanvasTexts((current) =>
      current.map((text) => (text.id === id ? { ...text, content } : text)),
    );
  };

  const updateTextFontStyle = (id: string, fontStyleId: PhotoStudioFontStyleId) => {
    setCanvasTexts((current) =>
      current.map((text) => (text.id === id ? { ...text, fontStyleId } : text)),
    );
  };

  const updateTextColor = (id: string, color: string) => {
    setCanvasTexts((current) => current.map((text) => (text.id === id ? { ...text, color } : text)));
  };

  const updateTextFontSize = (id: string, fontSize: number) => {
    const clamped = Math.min(MAX_TEXT_FONT_SIZE, Math.max(MIN_TEXT_FONT_SIZE, fontSize));
    setCanvasTexts((current) =>
      current.map((text) => (text.id === id ? { ...text, fontSize: clamped } : text)),
    );
  };

  const resizeCanvasText = (id: string, width: number) => {
    const clamped = Math.min(MAX_TEXT_WIDTH, Math.max(MIN_TEXT_WIDTH, width));
    setCanvasTexts((current) =>
      current.map((text) => (text.id === id ? { ...text, width: clamped } : text)),
    );
  };

  const moveCanvasText = (id: string, x: number, y: number) => {
    setCanvasTexts((current) =>
      current.map((text) =>
        text.id === id
          ? {
              ...text,
              x: Math.min(95, Math.max(5, x)),
              y: Math.min(95, Math.max(5, y)),
            }
          : text,
      ),
    );
  };

  const placeCanvasTextAtPointer = useCallback(
    (clientX: number, clientY: number) => {
      const container = canvasRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      const newText = createCanvasText(activeFontStyleId, x, y);
      setCanvasTexts((current) => [...current, newText]);
      setSelectedTextId(newText.id);
      clearShapeSelection();
      setEditingShapeTextId(null);
      setEditingTextId(newText.id);
      setCanvasHasEdits(true);
    },
    [activeFontStyleId, clearShapeSelection],
  );

  const handleCanvasPlaceText = (event: MouseEvent<HTMLDivElement>) => {
    if (
      editingTextId ||
      editingShapeTextId ||
      activeTool === "brush" ||
      activeTool === "eraser"
    ) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("[data-canvas-text]")) return;
    if (!canvasRef.current?.contains(target)) return;

    event.preventDefault();
    event.stopPropagation();
    placeCanvasTextAtPointer(event.clientX, event.clientY);
  };

  const removeCanvasTextIfEmpty = useCallback((id: string) => {
    setCanvasTexts((current) => current.filter((text) => text.id !== id));
    setSelectedTextId((current) => (current === id ? null : current));
    setEditingTextId((current) => (current === id ? null : current));
  }, []);

  const eraseShapesAtPoints = useCallback((points: PaintPoint[], radius: number) => {
    const container = canvasRef.current;
    if (!container || points.length === 0) return;
    const rect = container.getBoundingClientRect();

    setCanvasShapes((shapes) => {
      const removedShapeIds = new Set<string>();
      for (const point of points) {
        for (const shape of shapes) {
          if (!removedShapeIds.has(shape.id) && shapeHitByEraser(shape, point, radius, rect)) {
            removedShapeIds.add(shape.id);
          }
        }
      }
      if (removedShapeIds.size === 0) return shapes;

      setSelectedShapeIds((current) => current.filter((shapeId) => !removedShapeIds.has(shapeId)));
      setEditingShapeTextId((current) => (current && removedShapeIds.has(current) ? null : current));
      return shapes.filter((shape) => !removedShapeIds.has(shape.id));
    });

    setCanvasTexts((texts) => {
      const removedTextIds = new Set<string>();
      for (const point of points) {
        for (const text of texts) {
          if (!removedTextIds.has(text.id) && textHitByEraser(text, point, radius, rect)) {
            removedTextIds.add(text.id);
          }
        }
      }
      if (removedTextIds.size === 0) return texts;

      setSelectedTextId((current) => (current && removedTextIds.has(current) ? null : current));
      setEditingTextId((current) => (current && removedTextIds.has(current) ? null : current));
      return texts.filter((text) => !removedTextIds.has(text.id));
    });
  }, []);

  const paintStrokeBetween = useCallback(
    (from: PaintPoint, to: PaintPoint) => {
      const paintCanvas = paintCanvasRef.current;
      const ctx = paintCanvas?.getContext("2d");
      if (!ctx) return;

      if (activeTool === "brush") {
        const step = Math.max(1, brushSettings.size / 5);
        const points = interpolatePaintPoints(from, to, step);
        let previous = from;
        points.forEach((point) => {
          drawBrushSegment(ctx, previous, point, brushSettings);
          previous = point;
        });
        return;
      }

      if (activeTool === "eraser") {
        const samplePoints = collectEraserSamplePoints(from, to, eraserSettings.size);
        let previous = from;
        samplePoints.slice(1).forEach((point) => {
          drawEraserSegment(ctx, previous, point, eraserSettings.size);
          previous = point;
        });
        eraseShapesAtPoints(samplePoints, eraserSettings.size / 2);
      }
    },
    [activeTool, brushSettings, eraserSettings.size, eraseShapesAtPoints],
  );

  const handlePaintPointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (activeTool !== "brush" && activeTool !== "eraser") return;
      const container = canvasRef.current;
      const paintCanvas = paintCanvasRef.current;
      const ctx = paintCanvas?.getContext("2d");
      if (!container || !ctx) return;

      event.preventDefault();
      event.stopPropagation();
      isPaintingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setCanvasHasEdits(true);

      const point = getLocalPaintPoint(event.clientX, event.clientY, container);
      if (!point) return;

      lastPaintPointRef.current = point;

      if (activeTool === "brush") {
        drawBrushDot(ctx, point, brushSettings);
      } else {
        setEraserPreviewPoint(point);
        drawEraserDot(ctx, point, eraserSettings.size);
        eraseShapesAtPoints([point], eraserSettings.size / 2);
      }
    },
    [activeTool, brushSettings, eraserSettings.size, eraseShapesAtPoints],
  );

  const handlePaintPointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      const container = canvasRef.current;
      if (!container) return;

      const point = getLocalPaintPoint(event.clientX, event.clientY, container);
      if (!point) return;

      if (activeTool === "eraser") {
        setEraserPreviewPoint(point);
      }

      if (!isPaintingRef.current) return;

      const lastPoint = lastPaintPointRef.current;
      if (!lastPoint) {
        lastPaintPointRef.current = point;
        return;
      }

      paintStrokeBetween(lastPoint, point);
      lastPaintPointRef.current = point;
    },
    [activeTool, paintStrokeBetween],
  );

  const handlePaintPointerUp = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const wasPainting = isPaintingRef.current;
    isPaintingRef.current = false;
    lastPaintPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if ((event.type === "pointerleave" || event.type === "pointercancel") && wasPainting) {
      setEraserPreviewPoint(null);
    }
  }, []);

  const clearPaintCanvas = () => {
    const paintCanvas = paintCanvasRef.current;
    const ctx = paintCanvas?.getContext("2d");
    if (!paintCanvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    ctx.restore();
  };

  const deleteCanvasShape = useCallback(
    (id: string) => {
      const deleteIds = new Set(
        selectedShapeIds.includes(id) && selectedShapeIds.length > 0
          ? selectedShapeIds
          : [id],
      );
      setCanvasShapes((current) => current.filter((shape) => !deleteIds.has(shape.id)));
      setSelectedShapeIds((current) => current.filter((shapeId) => !deleteIds.has(shapeId)));
      setEditingShapeTextId((current) => (current && deleteIds.has(current) ? null : current));
    },
    [selectedShapeIds],
  );

  const deleteCanvasText = useCallback((id: string) => {
    setCanvasTexts((current) => current.filter((text) => text.id !== id));
    setSelectedTextId((current) => (current === id ? null : current));
    setEditingTextId((current) => (current === id ? null : current));
  }, []);

  const moveCanvasShape = (
    id: string,
    x: number,
    y: number,
    delta: { dx: number; dy: number },
  ) => {
    const source = canvasShapes.find((shape) => shape.id === id);
    const moveIds = new Set<string>([id]);

    if (source?.groupId) {
      canvasShapes
        .filter((shape) => shape.groupId === source.groupId)
        .forEach((shape) => moveIds.add(shape.id));
    } else if (selectedShapeIds.includes(id) && selectedShapeIds.length > 1) {
      selectedShapeIds.forEach((shapeId) => moveIds.add(shapeId));
    }

    const clampPercent = (value: number) => Math.min(95, Math.max(5, value));

    setCanvasShapes((current) =>
      current.map((shape) => {
        if (!moveIds.has(shape.id)) return shape;
        if (shape.id === id) {
          return { ...shape, x: clampPercent(x), y: clampPercent(y) };
        }
        return {
          ...shape,
          x: clampPercent(shape.x + delta.dx),
          y: clampPercent(shape.y + delta.dy),
        };
      }),
    );
  };

  const hasCanvasEdits =
    shapeDragActive ||
    canvasDragOver ||
    canvasShapes.length > 0 ||
    canvasTexts.length > 0 ||
    canvasHasEdits;
  const hideCanvasOverlay = hasCanvasEdits || Boolean(selectedGeneration);
  const showEmptyCanvasOverlay = !hasCanvasEdits && !selectedGeneration;
  const isGenerationMaterialized = Boolean(
    selectedGeneration && materializedGenerationId === selectedGeneration.id,
  );
  const showStandardGenerationPreview =
    Boolean(selectedGeneration) &&
    !selectedGeneration?.transparentBackground &&
    !isGenerationMaterialized;
  const showAiGeneratedLogo =
    Boolean(selectedGeneration?.transparentBackground) && !isGenerationMaterialized;
  const hasExportableCanvasContent = hasCanvasEdits || Boolean(selectedGeneration);
  const usesDesignCanvas = !showStandardGenerationPreview;

  const canvasSurfaceStyle: CSSProperties | undefined = (() => {
    const customEnd = customCanvasGradientEnabled ? customCanvasGradientEnd : undefined;
    if (usesDesignCanvas) {
      return resolveCanvasBackgroundStyle(canvasBackgroundId, customCanvasBackgroundColor, customEnd);
    }
    return undefined;
  })();

  const handleExportCanvas = useCallback(
    async (mode: "composite" | "transparent" = "composite") => {
      const container = canvasRef.current;
      const paintCanvas = paintCanvasRef.current;
      if (!container || isExporting) return;

      setIsExporting(true);
      try {
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = Math.floor(width * dpr);
        exportCanvas.height = Math.floor(height * dpr);
        const ctx = exportCanvas.getContext("2d");
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (mode === "composite") {
          const customEnd = customCanvasGradientEnabled ? customCanvasGradientEnd : undefined;
          if (usesDesignCanvas || showAiGeneratedLogo) {
            drawCanvasBackgroundToContext(
              ctx,
              canvasBackgroundId,
              width,
              height,
              customCanvasBackgroundColor,
              customEnd,
            );
          } else if (showStandardGenerationPreview && selectedGeneration) {
            drawCanvasBackgroundToContext(
              ctx,
              defaultCanvasBackgroundIds[(selectedGeneration.variantIndex ?? 0) % defaultCanvasBackgroundIds.length],
              width,
              height,
            );
          } else if (hasCanvasEdits && !selectedGeneration) {
            drawCheckerboardBackground(ctx, width, height);
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
          }
        }

        if (showAiGeneratedLogo && selectedGeneration) {
          drawLogoPreviewToContext(
            ctx,
            selectedGeneration.prompt,
            width,
            height,
            selectedGeneration.variantIndex ?? 0,
          );
        }

        if (paintCanvas && paintCanvas.width > 0 && paintCanvas.height > 0) {
          ctx.drawImage(paintCanvas, 0, 0, width, height);
        }

        drawPhotoStudioShapeStageToContext(shapeStageRef.current, ctx, width, height);

        for (const text of canvasTexts) {
          const fontStyle = getFontStyleById(text.fontStyleId);
          const boxWidth = (text.width / 100) * width;
          const centerX = (text.x / 100) * width;
          const centerY = (text.y / 100) * height;
          const fontSize = Math.min(text.fontSize, Math.max(12, boxWidth * 0.11));
          ctx.save();
          ctx.fillStyle = text.color;
          ctx.font = buildCanvasFont(fontStyle, fontSize);
          if (fontStyle.letterSpacing) {
            (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
              fontStyle.letterSpacing;
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          drawWrappedTextOnContext(
            ctx,
            text.content,
            centerX - boxWidth / 2,
            centerY - fontSize * 0.45,
            boxWidth,
            fontSize * 1.2,
          );
          ctx.restore();
        }

        const slug = workspaceTitle.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "photo-studio";
        const link = document.createElement("a");
        link.download =
          mode === "transparent"
            ? `${slug}${canvasDesign.exportTransparentFilenameSuffix}.png`
            : `${slug}.png`;
        link.href = exportCanvas.toDataURL("image/png");
        link.click();
      } catch {
        // Export failed silently — canvas may be empty or tainted.
      } finally {
        setIsExporting(false);
      }
    },
    [
      canvasBackgroundId,
      canvasDesign.exportTransparentFilenameSuffix,
      canvasTexts,
      customCanvasBackgroundColor,
      customCanvasGradientEnabled,
      customCanvasGradientEnd,
      hasCanvasEdits,
      isExporting,
      selectedGeneration,
      showAiGeneratedLogo,
      showStandardGenerationPreview,
      usesDesignCanvas,
      workspaceTitle,
    ],
  );

  const activeCanvasFillColor =
    canvasBackgroundId === "custom" && !customCanvasGradientEnabled
      ? customCanvasBackgroundColor
      : legacyCanvasSolidColors[canvasBackgroundId] ?? null;

  const handleCanvasFillColorSelect = (color: string) => {
    setCanvasBackgroundId("custom");
    setCustomCanvasGradientEnabled(false);
    setCustomCanvasBackgroundColor(color);
  };

  const canSelectShapes = activeTool === "select" || activeTool === "shape";
  const canSelectTexts = activeTool === "select" || activeTool === "text";
  const canMoveShapes = activeTool === "move";
  const canMoveTexts = activeTool === "move";
  const canDragShapes = canMoveShapes || canSelectShapes;
  const canDragTexts = canMoveTexts || activeTool === "select";
  const canResizeShapes = activeTool === "select" || activeTool === "shape";
  const canResizeTexts = activeTool === "select";
  const canEditShapeText = activeTool === "select" || activeTool === "shape";
  const isBrushToolActive = activeTool === "brush";
  const isEraserToolActive = activeTool === "eraser";
  const isDrawingToolActive = isBrushToolActive || isEraserToolActive;
  const canEditCanvasText = !isDrawingToolActive;
  const isCanvasElementToolActive = isDrawingToolActive;
  const blockShapeInteraction = isDrawingToolActive;
  const drawingToolMode: DrawingToolMode = isBrushToolActive
    ? "brush"
    : isEraserToolActive
      ? "eraser"
      : "none";

  const selectionPanelAnchor = useMemo(() => {
    if (
      !canSelectShapes ||
      selectedShapes.length === 0 ||
      editingShapeTextId ||
      canvasPixelSize.width <= 0 ||
      canvasPixelSize.height <= 0
    ) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    if (selectionBounds) {
      minX = selectionBounds.minX;
      minY = selectionBounds.minY;
      maxX = selectionBounds.maxX;
      maxY = selectionBounds.maxY;
    } else {
      for (const shape of selectedShapes) {
        const box = shapePercentToBox(shape, canvasPixelSize);
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      }
    }

    if (!Number.isFinite(minX)) return null;

    const pad = CANVAS_SELECTION_PANEL_PADDING;
    const panelW = CANVAS_SELECTION_PANEL_COMPACT_WIDTH;
    const panelH = CANVAS_SELECTION_PANEL_COMPACT_HEIGHT;
    const gap = 12;
    const canvasW = canvasPixelSize.width;
    const canvasH = canvasPixelSize.height;

    let left = maxX + gap;
    if (left + panelW > canvasW - pad) {
      left = minX - gap - panelW;
    }
    left = Math.max(pad, Math.min(left, canvasW - panelW - pad));

    const selectionCenterY = (minY + maxY) / 2;
    let top = selectionCenterY - panelH / 2;
    if (top < pad) {
      top = maxY + gap;
    }
    if (top + panelH > canvasH - pad) {
      top = minY - gap - panelH;
    }
    top = Math.max(pad, Math.min(top, canvasH - panelH - pad));

    return { left, top };
  }, [canSelectShapes, canvasPixelSize, editingShapeTextId, selectedShapes, selectionBounds]);

  useEffect(() => {
    setSelectionPanelMoreOpen(false);
  }, [selectedShapeIds]);

  const canUngroupSelection = selectedShapes.some((shape) => Boolean(shape.groupId));
  const selectionSharesOneGroup =
    selectedShapes.length > 0 &&
    selectedShapes.every((shape) => shape.groupId) &&
    new Set(selectedShapes.map((shape) => shape.groupId)).size === 1;
  const canGroupSelection = selectedShapeIds.length >= 2 && !selectionSharesOneGroup;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shapeShortcutsActive = activeTool === "select" || activeTool === "shape";
      if (!shapeShortcutsActive) return;

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "d" &&
        (selectedShapeIds.length > 0 || selectedShapeId)
      ) {
        event.preventDefault();
        duplicateSelectedShapes();
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (editingShapeTextId || editingTextId) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (selectedShapeIds.length > 0 || selectedShapeId) {
        event.preventDefault();
        deleteCanvasShape(selectedShapeId ?? selectedShapeIds[0] ?? "");
        return;
      }

      if (selectedTextId && activeTool === "select") {
        event.preventDefault();
        deleteCanvasText(selectedTextId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTool,
    deleteCanvasShape,
    deleteCanvasText,
    duplicateSelectedShapes,
    editingShapeTextId,
    editingTextId,
    selectedShapeId,
    selectedShapeIds,
    selectedTextId,
  ]);

  const workspaceGridColumns = leftSidebarCollapsed
    ? "lg:[grid-template-columns:minmax(0,1fr)]"
    : "lg:[grid-template-columns:17rem_minmax(0,1fr)]";

  const closeAssistPanel = () => {
    setActiveAssistPanel(null);
  };

  const renderPromptPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prompt</p>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            placeholder="Describe your logo, product shot, or campaign visual…"
            className="mt-2 w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Creation type
          </p>
          <div className="mt-2 space-y-1.5">
            {creationTypeOptions.map((type) => {
              const Icon = type.icon;
              const accent = creationTypeAccents[type.id];
              const theme = accentThemes[accent];
              const selected = creationType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setCreationType(type.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all",
                    selected
                      ? "border-primary/25 bg-primary/10 ring-2 ring-primary/10"
                      : "border-border/30 bg-background/55 hover:bg-background",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      selected ? theme.icon : "bg-muted/60 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-foreground">{type.label}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {type.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {creationType === "logo" ? (
          <div className="rounded-xl border border-primary/25 bg-foreground/[0.06] p-3">
            <OptionSegmentedControl
              label="Logo background"
              hint="Transparent PNG removes the backdrop for overlays. Solid bakes a background into the generated logo."
              value={logoTransparentBackground ? "transparent" : "solid"}
              options={[
                { id: "transparent", label: "Transparent" },
                { id: "solid", label: "Solid" },
              ]}
              onChange={(id) => setLogoTransparentBackground(id === "transparent")}
            />
            <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
              You can also build visuals manually with shapes and text — the canvas label updates
              based on your aspect ratio (logo, banner, product image, or story).
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Canvas format
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Choose a frame that matches your creative intent before generating.
          </p>
          <div className="mt-3 rounded-xl border border-border/30 bg-gradient-to-b from-muted/25 via-background/40 to-transparent p-2.5">
            <AspectRatioPicker
              value={aspectRatio}
              onChange={setAspectRatio}
              variant="premium"
              ratioOptions={aspectRatioPickerOptions}
            />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Style preset
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {studioOptions.stylePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setStylePreset(preset.id)}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors",
                  stylePreset === preset.id
                    ? "bg-foreground/[0.08] text-foreground ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                <Palette className="h-3 w-3" />
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-border/30 p-3">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!prompt.trim() || isGenerating}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? "Generating…" : creationType === "logo" && logoTransparentBackground ? "Generate logo" : "Generate image"}
        </button>
      </div>
    </div>
  );

  const renderChatPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Chat</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Ask questions about your canvas, layout, colors, or next steps.
          </p>
        </div>
        {chatMessages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/[0.1] bg-muted/15 dark:border-white/[0.18] dark:bg-white/[0.03] px-3 py-6 text-center">
            <MessageCircle className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-xs font-semibold text-foreground">Start a conversation</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Try “How can I improve this logo?” or “Suggest a background for this banner.”
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs leading-relaxed",
                  message.role === "user"
                    ? "ml-4 bg-primary/10 text-foreground"
                    : "mr-4 border border-border/30 bg-background/80 text-foreground",
                )}
              >
                {message.content}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-border/30 p-3">
        <textarea
          value={chatDraft}
          onChange={(event) => setChatDraft(event.target.value)}
          rows={3}
          placeholder="Ask about your canvas…"
          className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
        />
        <button
          type="button"
          onClick={() => {
            const trimmed = chatDraft.trim();
            if (!trimmed) return;
            const userMessage = {
              id: `chat-${Date.now()}-user`,
              role: "user" as const,
              content: trimmed,
            };
            setChatMessages((current) => [
              ...current,
              userMessage,
              {
                id: `chat-${Date.now()}-assistant`,
                role: "assistant" as const,
                content:
                  "Chat responses will connect to your assistant soon. For now, use Prompt to generate new visuals or Select to edit layers on the canvas.",
              },
            ]);
            setChatDraft("");
          }}
          disabled={!chatDraft.trim()}
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageCircle className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  );

  const renderToolsPanel = () => (
    <div
      className="relative hidden min-h-0 shrink-0 lg:flex"
      style={{ width: rightToolbarExpanded ? rightSidebarWidth : RIGHT_SIDEBAR_COLLAPSED_WIDTH }}
    >
      {rightToolbarExpanded ? (
        <SidebarResizeHandle onDrag={handleRightSidebarResize} onDragEnd={handleRightSidebarResizeEnd} />
      ) : null}
      <aside className="flex min-h-0 w-full flex-col overflow-hidden border-l border-border/30 bg-white dark:bg-background">
        <div
          className={cn(
            "shrink-0 border-b border-border/30",
            rightToolbarExpanded ? "px-3 py-2.5" : "px-2 py-2",
          )}
        >
          {rightToolbarExpanded ? (
            <div className="flex items-center justify-between gap-2">
              {activeAssistPanel === "prompt" ? (
                <button
                  type="button"
                  onClick={closeAssistPanel}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                  aria-label="Back to tools"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span>Prompt</span>
                </button>
              ) : activeAssistPanel === "chat" ? (
                <button
                  type="button"
                  onClick={closeAssistPanel}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                  aria-label="Back to tools"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span>Ask</span>
                </button>
              ) : editToolSubPanel === "shape" ? (
                <button
                  type="button"
                  onClick={closeEditToolSubPanel}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                  aria-label="Back to tools"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span>Shape</span>
                </button>
              ) : editToolSubPanel === "text" ? (
                <button
                  type="button"
                  onClick={closeEditToolSubPanel}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                  aria-label="Back to tools"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span>Text</span>
                </button>
              ) : (
                <p className="text-xs font-semibold text-foreground">Tools</p>
              )}
              <button
                type="button"
                onClick={toggleRightToolbar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                aria-label="Collapse tools"
              >
                <PanelRightClose className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {activeAssistPanel === "prompt" || activeAssistPanel === "chat" || editToolSubPanel === "shape" || editToolSubPanel === "text" ? (
                <button
                  type="button"
                  onClick={activeAssistPanel ? closeAssistPanel : closeEditToolSubPanel}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  aria-label="Back to tools"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={toggleRightToolbar}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                aria-label="Expand tools"
              >
                <PanelRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {rightToolbarExpanded && activeAssistPanel === "prompt" ? (
          renderPromptPanel()
        ) : rightToolbarExpanded && activeAssistPanel === "chat" ? (
          renderChatPanel()
        ) : (
          <>
            <div className={cn("min-h-0 flex-1 overflow-y-auto", rightToolbarExpanded ? "p-3" : "p-2")}>
              <section className="space-y-2">
                {editToolSubPanel === "shape" ? (
                  <>
                    {rightToolbarExpanded ? (
                      <div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Drag a shape onto the canvas.
                        </p>
                      </div>
                    ) : null}
                    <div className="space-y-3">
                      {shapeToolGroups.map((group) => (
                        <div key={group.title} className="space-y-1.5">
                          {rightToolbarExpanded ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              {group.title}
                            </p>
                          ) : null}
                          <div
                            className={cn(
                              "grid gap-1.5",
                              rightToolbarExpanded ? "grid-cols-3" : "grid-cols-1",
                            )}
                          >
                            {group.tools.map((shape) => {
                              const ShapeIcon = shape.icon;
                              const selected = activeShapeType === shape.id;
                              return (
                                <WorkspaceTooltip
                                  key={shape.id}
                                  label={shape.label}
                                  enabled={!rightToolbarExpanded}
                                >
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(event) => handleShapeDragStart(event, shape.id)}
                                    onDragEnd={handleShapeDragEnd}
                                    onClick={() => setActiveShapeType(shape.id)}
                                    className={cn(
                                      "flex w-full rounded-lg border transition-all duration-200",
                                      rightToolbarExpanded
                                        ? "flex-col items-center justify-center gap-1 px-1 py-2 text-center"
                                        : "items-center justify-center p-2.5",
                                      selected
                                        ? "border-primary/25 bg-primary/10 text-primary ring-2 ring-primary/10"
                                        : "border-border/30 bg-background/55 text-foreground hover:bg-background",
                                      "cursor-grab active:cursor-grabbing",
                                    )}
                                    aria-label={`${shape.label} — drag to canvas`}
                                    aria-pressed={selected}
                                  >
                                    <span
                                      className={cn(
                                        "flex shrink-0 items-center justify-center rounded-md",
                                        rightToolbarExpanded ? "h-7 w-7" : "h-8 w-8",
                                        selected
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted/60 text-muted-foreground",
                                      )}
                                    >
                                      <ShapeIcon
                                        className={cn(
                                          rightToolbarExpanded ? "h-3.5 w-3.5" : "h-4 w-4",
                                          shape.id === "ellipse" && "scale-x-125",
                                          (shape.id === "line" ||
                                            shape.id === "curvedLine" ||
                                            shape.id === "arc") &&
                                            "rotate-[-35deg]",
                                          shape.id === "arc" && "scale-90",
                                        )}
                                      />
                                    </span>
                                    {rightToolbarExpanded ? (
                                      <span className="block w-full truncate text-[10px] font-semibold leading-tight">
                                        {shape.label}
                                      </span>
                                    ) : null}
                                  </button>
                                </WorkspaceTooltip>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : editToolSubPanel === "text" ? (
                  <>
                    {rightToolbarExpanded ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Typography
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Pick a typeface, then double-click anywhere on the canvas to add text.
                        </p>
                      </div>
                    ) : null}
                    <FontStyleList
                      expanded={rightToolbarExpanded}
                      activeFontStyleId={activeFontStyleId}
                      onSelect={setActiveFontStyleId}
                    />
                  </>
                ) : (
                  <>
                    {rightToolbarExpanded ? (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Edit
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          Select, transform, paint, mask, and refine elements on the canvas.
                        </p>
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "grid gap-1.5",
                        rightToolbarExpanded ? "grid-cols-3" : "grid-cols-1",
                      )}
                    >
                      {workspaceTools.map((tool) => {
                        const Icon = tool.icon;
                        const active = activeTool === tool.id;
                        return (
                          <WorkspaceTooltip
                            key={tool.id}
                            label={tool.label}
                            hint={`Shortcut ${tool.shortcut}`}
                            enabled={!rightToolbarExpanded}
                          >
                            <button
                              type="button"
                              onClick={() => selectWorkspaceTool(tool.id)}
                              className={cn(
                                "flex w-full rounded-lg border transition-all duration-200",
                                rightToolbarExpanded
                                  ? "flex-col items-center justify-center gap-1 px-1 py-2 text-center"
                                  : "items-center justify-center p-2.5",
                                active
                                  ? "border-primary/25 bg-primary/10 text-primary ring-2 ring-primary/10"
                                  : "border-border/30 bg-background/55 text-foreground hover:bg-background",
                              )}
                              aria-label={tool.label}
                            >
                              <span
                                className={cn(
                                  "flex shrink-0 items-center justify-center rounded-md",
                                  rightToolbarExpanded ? "h-7 w-7" : "h-8 w-8",
                                  active
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/60 text-muted-foreground",
                                )}
                              >
                                <Icon className={cn(rightToolbarExpanded ? "h-3.5 w-3.5" : "h-4 w-4")} />
                              </span>
                              {rightToolbarExpanded ? (
                                <span className="block w-full truncate text-[10px] font-semibold leading-tight">
                                  {tool.label}
                                </span>
                              ) : null}
                            </button>
                          </WorkspaceTooltip>
                        );
                      })}
                    </div>

                    {rightToolbarExpanded && canSelectShapes && !selectedShape && !selectedText && isGenerationMaterialized ? (
                      <div className="mt-3 rounded-xl border border-primary/20 bg-foreground/[0.06] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Generated layers
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          Click a shape or text block on the canvas to edit its color, size, and style.
                        </p>
                      </div>
                    ) : null}

                    {rightToolbarExpanded && canSelectShapes && selectedShapes.length > 0 ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-border/30 bg-background/55 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {selectedShapes.length > 1
                            ? `${selectedShapes.length} shapes selected`
                            : "Shape style"}
                        </p>

                        {selectedShape && isLineLikeShapeType(selectedShape.shapeType) ? (
                          <p className="rounded-lg border border-border/30 bg-muted/25 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
                            Drag the <span className="font-medium text-foreground">selection handles</span> on
                            the canvas: move endpoints to stretch the line.
                            {lineShapeHasCurveHandle(selectedShape.shapeType)
                              ? " Drag the middle handle to bend the curve."
                              : " Straight and arrow lines stay straight."}
                          </p>
                        ) : null}

                        {selectedShape && isChatGptSolidIcon(selectedShape) ? (
                          <p className="rounded-lg border border-border/30 bg-muted/25 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
                            Use <span className="font-medium text-foreground">Background</span> for the
                            icon fill and <span className="font-medium text-foreground">Border color</span>{" "}
                            + <span className="font-medium text-foreground">Thickness</span> for the outline.
                            Canvas backdrop is under background settings above the canvas.
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={duplicateSelectedShapes}
                            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/35 bg-background/80 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/50"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicate
                          </button>
                          {selectedShapes.length > 1 ? (
                            <button
                              type="button"
                              onClick={groupSelectedShapes}
                              disabled={!canGroupSelection}
                              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/35 bg-background/80 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <GroupIcon className="h-3.5 w-3.5" />
                              Group
                            </button>
                          ) : null}
                          {canUngroupSelection ? (
                            <button
                              type="button"
                              onClick={ungroupSelectedShapes}
                              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/35 bg-background/80 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/50"
                            >
                              <Ungroup className="h-3.5 w-3.5" />
                              Ungroup
                            </button>
                          ) : null}
                        </div>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          Ctrl+click (⌘ on Mac) to multi-select. Use the toolbar beside the
                          selection for duplicate, group, and delete.
                        </p>

                        {selectedShape && shapeSupportsFillElement(selectedShape) ? (
                          <div className="space-y-2">
                            <p className="text-[10px] leading-relaxed text-muted-foreground">
                              Double-click the shape to add or edit text (Select or Shape tool).
                            </p>
                            <button
                              type="button"
                              onClick={() => setEditingShapeTextId(selectedShape.id)}
                              className="h-8 w-full rounded-lg border border-border/35 bg-background/80 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/50"
                            >
                              {selectedShape.label ? "Edit label" : "Add label"}
                            </button>
                          </div>
                        ) : null}

                        {selectedShape ? (
                          <ShapeColorInput
                            label="Border color"
                            value={selectedShape.strokeColor}
                            onChange={(strokeColor) =>
                              updateShapeColors(selectedShape.id, { strokeColor })
                            }
                          />
                        ) : null}

                        {selectedShape && shapeSupportsFillElement(selectedShape) ? (
                          <>
                            <ShapeColorInput
                              label="Background"
                              value={selectedShape.fillColor}
                              onChange={(fillColor) =>
                                updateShapeColors(selectedShape.id, { fillColor })
                              }
                            />
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-medium text-foreground">Background opacity</p>
                                <span className="text-[11px] font-semibold tabular-nums text-foreground">
                                  {Math.round(selectedShape.fillOpacity * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={Math.round(selectedShape.fillOpacity * 100)}
                                onChange={(event) =>
                                  updateShapeColors(selectedShape.id, {
                                    fillOpacity: Number(event.target.value) / 100,
                                  })
                                }
                                aria-label="Background opacity"
                                className="h-1.5 w-full cursor-pointer accent-primary"
                              />
                            </div>
                          </>
                        ) : null}

                        {selectedShape && shapeSupportsSideGaps(selectedShape.shapeType) ? (
                          <div className="space-y-3 border-t border-border/30 pt-3">
                            <div>
                              <p className="text-[11px] font-medium text-foreground">Edge gaps (weave)</p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Cut openings on rectangle sides so other shapes can pass through. Stack
                                layers to build interwoven logos.
                              </p>
                            </div>
                            {SHAPE_SIDES.map((side) => {
                              const gap = selectedShape.sideGaps?.[side] ?? null;
                              const enabled = Boolean(gap);
                              const config = gap ?? DEFAULT_SIDE_GAP;
                              const sideLabel =
                                side === "top"
                                  ? "Top"
                                  : side === "right"
                                    ? "Right"
                                    : side === "bottom"
                                      ? "Bottom"
                                      : "Left";
                              return (
                                <div
                                  key={side}
                                  className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-2"
                                >
                                  <label className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="font-medium text-foreground">{sideLabel} gap</span>
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      onChange={(event) =>
                                        updateShapeSideGap(
                                          selectedShape.id,
                                          side,
                                          event.target.checked ? { ...DEFAULT_SIDE_GAP } : null,
                                        )
                                      }
                                      className="accent-primary"
                                    />
                                  </label>
                                  {enabled ? (
                                    <>
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-muted-foreground">Opening width</span>
                                        <span className="tabular-nums font-semibold">{config.size}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min={5}
                                        max={80}
                                        step={1}
                                        value={config.size}
                                        onChange={(event) =>
                                          updateShapeSideGap(selectedShape.id, side, {
                                            ...config,
                                            size: Number(event.target.value),
                                          })
                                        }
                                        className="h-1.5 w-full cursor-pointer accent-primary"
                                      />
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-muted-foreground">Position</span>
                                        <span className="tabular-nums font-semibold">{config.position}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={config.position}
                                        onChange={(event) =>
                                          updateShapeSideGap(selectedShape.id, side, {
                                            ...config,
                                            position: Number(event.target.value),
                                          })
                                        }
                                        className="h-1.5 w-full cursor-pointer accent-primary"
                                      />
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-muted-foreground">Cut depth</span>
                                        <span className="tabular-nums font-semibold">{config.depth}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min={5}
                                        max={50}
                                        step={1}
                                        value={config.depth}
                                        onChange={(event) =>
                                          updateShapeSideGap(selectedShape.id, side, {
                                            ...config,
                                            depth: Number(event.target.value),
                                          })
                                        }
                                        className="h-1.5 w-full cursor-pointer accent-primary"
                                      />
                                    </>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {selectedShape &&
                        shapeSupportsCornerRadius(selectedShape.shapeType) &&
                        !shapeHasSideGaps(selectedShape.sideGaps) ? (
                          <div className="space-y-2 border-t border-border/30 pt-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-foreground">Corner radius</p>
                              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                                {selectedShape.cornerRadius}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={MIN_SHAPE_CORNER_RADIUS}
                              max={getMaxCornerRadius(selectedShape.shapeType)}
                              step={1}
                              value={selectedShape.cornerRadius}
                              onChange={(event) =>
                                updateShapeCornerRadius(Number(event.target.value))
                              }
                              aria-label="Corner radius"
                              className="h-1.5 w-full cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Sharp</span>
                              <span>Rounded</span>
                            </div>
                          </div>
                        ) : null}

                        {selectedShape && !isLineLikeShapeType(selectedShape.shapeType) ? (
                          <div className="space-y-2 border-t border-border/30 pt-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-foreground">Rotation</p>
                              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                                {Math.round(selectedShape.rotation ?? 0)}°
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={359}
                              step={1}
                              value={Math.round(selectedShape.rotation ?? 0)}
                              onChange={(event) =>
                                updateShapeRotation(Number(event.target.value))
                              }
                              aria-label="Shape rotation"
                              className="h-1.5 w-full cursor-pointer accent-primary"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Or drag the rotate handle on the canvas.
                            </p>
                          </div>
                        ) : null}

                        {selectedShape ? (
                          <div className="space-y-2 border-t border-border/30 pt-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-foreground">Thickness</p>
                              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                                {selectedShape.strokeWidth}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={MIN_SHAPE_STROKE_WIDTH}
                              max={MAX_SHAPE_STROKE_WIDTH}
                              step={1}
                              value={selectedShape.strokeWidth}
                              onChange={(event) =>
                                updateShapeStrokeWidth(selectedShape.id, Number(event.target.value))
                              }
                              aria-label="Shape thickness"
                              className="h-1.5 w-full cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Thin</span>
                              <span>Thick</span>
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => deleteCanvasShape(selectedShapeId ?? selectedShapes[0]?.id ?? "")}
                          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete shape
                        </button>
                      </div>
                    ) : null}

                    {rightToolbarExpanded && canSelectTexts && selectedText ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-border/30 bg-background/55 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Text style
                        </p>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          Double-click text to edit. Drag the handle to resize width.
                        </p>

                        <div className="space-y-2">
                          <p className="text-[11px] font-medium text-foreground">Typeface</p>
                          <FontStyleList
                            embedded
                            expanded={rightToolbarExpanded}
                            activeFontStyleId={selectedText.fontStyleId}
                            onSelect={(fontStyleId) => updateTextFontStyle(selectedText.id, fontStyleId)}
                          />
                        </div>

                        <ShapeColorInput
                          label="Color"
                          value={selectedText.color}
                          onChange={(color) => updateTextColor(selectedText.id, color)}
                        />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium text-foreground">Size</p>
                            <span className="text-[11px] font-semibold tabular-nums text-foreground">
                              {selectedText.fontSize}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={MIN_TEXT_FONT_SIZE}
                            max={MAX_TEXT_FONT_SIZE}
                            step={1}
                            value={selectedText.fontSize}
                            onChange={(event) =>
                              updateTextFontSize(selectedText.id, Number(event.target.value))
                            }
                            aria-label="Text size"
                            className="h-1.5 w-full cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Small</span>
                            <span>Large</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteCanvasText(selectedText.id)}
                          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete text
                        </button>
                      </div>
                    ) : null}

                    {rightToolbarExpanded && isBrushToolActive ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-border/30 bg-background/55 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Brush style
                        </p>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          Click and drag on the canvas to paint.
                        </p>

                        <ShapeColorInput
                          label="Color"
                          value={brushSettings.color}
                          onChange={(color) => setBrushSettings((current) => ({ ...current, color }))}
                          density="minimal"
                        />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium text-foreground">Thickness</p>
                            <span className="text-[11px] font-semibold tabular-nums text-foreground">
                              {brushSettings.size}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={MIN_BRUSH_SIZE}
                            max={MAX_BRUSH_SIZE}
                            step={1}
                            value={brushSettings.size}
                            onChange={(event) =>
                              setBrushSettings((current) => ({
                                ...current,
                                size: Number(event.target.value),
                              }))
                            }
                            aria-label="Brush thickness"
                            className="h-1.5 w-full cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Thin</span>
                            <span>Thick</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium text-foreground">Opacity</p>
                            <span className="text-[11px] font-semibold tabular-nums text-foreground">
                              {Math.round(brushSettings.opacity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={100}
                            step={5}
                            value={Math.round(brushSettings.opacity * 100)}
                            onChange={(event) =>
                              setBrushSettings((current) => ({
                                ...current,
                                opacity: Number(event.target.value) / 100,
                              }))
                            }
                            aria-label="Brush opacity"
                            className="h-1.5 w-full cursor-pointer accent-primary"
                          />
                        </div>

                        {canvasHasEdits ? (
                          <button
                            type="button"
                            onClick={clearPaintCanvas}
                            className="h-8 w-full rounded-lg border border-border/30 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                          >
                            Clear paint layer
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {rightToolbarExpanded && isEraserToolActive ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-border/30 bg-background/55 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Eraser
                        </p>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          Drag over brush strokes or shapes to erase them.
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium text-foreground">Size</p>
                            <span className="text-[11px] font-semibold tabular-nums text-foreground">
                              {eraserSettings.size}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={MIN_BRUSH_SIZE}
                            max={MAX_BRUSH_SIZE}
                            step={1}
                            value={eraserSettings.size}
                            onChange={(event) =>
                              setEraserSettings({ size: Number(event.target.value) })
                            }
                            aria-label="Eraser size"
                            className="h-1.5 w-full cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Small</span>
                            <span>Large</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </section>

              <section className="mt-5 space-y-2 border-t border-border/30 pt-4">
                {rightToolbarExpanded ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    AI assist
                  </p>
                ) : null}
                {assistTools.map((item) => {
                  const Icon = item.icon;
                  const active = activeAssistPanel === item.id;
                  return (
                    <WorkspaceTooltip
                      key={item.id}
                      label={item.label}
                      hint={item.description}
                      enabled={!rightToolbarExpanded}
                    >
                      <button
                        type="button"
                        onClick={() => openAssistPanel(item.id)}
                        className={cn(
                          "flex w-full items-center rounded-xl border text-left transition-all duration-200",
                          rightToolbarExpanded ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
                          active
                            ? "border-primary/25 bg-primary/10 text-primary ring-2 ring-primary/10"
                            : "border-border/30 bg-background/55 text-foreground hover:bg-background",
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        {rightToolbarExpanded ? (
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-foreground">{item.label}</span>
                            <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        ) : null}
                      </button>
                    </WorkspaceTooltip>
                  );
                })}
              </section>
            </div>
          </>
        )}
      </aside>
    </div>
  );

  return (
    <div className={cn("grid min-h-0 flex-1 grid-cols-1", workspaceGridColumns)}>
      {!leftSidebarCollapsed ? (
        <aside className="hidden min-h-0 min-w-0 overflow-hidden border-r border-border/30 bg-white lg:flex lg:flex-col dark:bg-background">
          <nav
            className="flex shrink-0 items-stretch border-b border-border/40 bg-gradient-to-b from-muted/25 to-transparent"
            aria-label="Workspace panels"
          >
            <div className="flex min-w-0 flex-1" role="tablist">
              {leftSidebarTabs.map((tab) => {
                const Icon = tab.icon;
                const selected = leftPanelTab === tab.id;
                const badgeCount =
                  tab.id === "uploads"
                    ? workspaceUploads.length
                    : tab.id === "designs"
                      ? savedDesigns.length
                      : tab.id === "generations"
                        ? generatedItems.length
                        : 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={tab.label}
                    title={tab.hint}
                    onClick={() => setLeftPanelTab(tab.id)}
                    className={cn(
                      "group relative flex min-w-0 flex-1 flex-col items-center gap-1 border-b-2 px-1 py-2.5 transition-all duration-200",
                      selected
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/20 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
                        selected
                          ? "bg-primary/12 ring-1 ring-primary/15"
                          : "bg-transparent group-hover:bg-muted/50",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={selected ? 2.25 : 2} />
                      {badgeCount > 0 ? (
                        <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground shadow-sm">
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="max-w-full truncate text-[10px] font-semibold tracking-wide">
                      {tab.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setLeftSidebarCollapsed(true)}
              className="flex w-9 shrink-0 items-center justify-center border-l border-border/30 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            </button>
          </nav>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
              {leftPanelTab === "assets" ? (
                <>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                    <SidebarCollapsibleSection
                      id="canvas-format"
                      title="Canvas format"
                      hint={canvasDesign.title}
                      icon={Crop}
                      accent="neutral"
                      open={assetsPanelOpenSection === "canvasFormat"}
                      onToggle={() => toggleAssetsPanelSection("canvasFormat")}
                    >
                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                        Select a ratio that fits your layout before you design or generate.
                      </p>
                      <AspectRatioPicker
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        variant="premium"
                        ratioOptions={aspectRatioPickerOptions}
                      />
                    </SidebarCollapsibleSection>

                    <SidebarCollapsibleSection
                      id="color-palette"
                      title="Color palette"
                      hint={
                        hasCanvasEdits ? canvasDesign.previewHintActive : canvasDesign.previewHintIdle
                      }
                      icon={Palette}
                      accent="neutral"
                      open={assetsPanelOpenSection === "background"}
                      onToggle={() => toggleAssetsPanelSection("background")}
                    >
                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                        {hasCanvasEdits ? canvasDesign.previewHintActive : canvasDesign.previewHintIdle}
                      </p>
                      <div className="space-y-3 rounded-xl border border-black/[0.06] bg-white/50 p-2.5 ring-1 ring-black/[0.03] dark:border-white/[0.1] dark:bg-white/[0.03] dark:ring-white/[0.06]">
                        <div>
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Solid colors
                          </p>
                          <PhotoStudioColorPaletteGrid
                            value={activeCanvasFillColor}
                            onSelect={handleCanvasFillColorSelect}
                            swatchSize="sm"
                          />
                        </div>

                        <div>
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Gradients
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {canvasGradientBackgroundPresets.map((preset) => (
                              <CanvasBackgroundPresetButton
                                key={preset.id}
                                preset={preset}
                                selected={canvasBackgroundId === preset.id}
                                onSelect={() => setCanvasBackgroundId(preset.id)}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            More
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {canvasSpecialBackgroundPresets.map((preset) => {
                              const customEnd = customCanvasGradientEnabled
                                ? customCanvasGradientEnd
                                : undefined;
                              return (
                                <CanvasBackgroundPresetButton
                                  key={preset.id}
                                  preset={preset}
                                  selected={canvasBackgroundId === preset.id}
                                  onSelect={() => setCanvasBackgroundId(preset.id)}
                                  previewStyle={resolveCanvasBackgroundStyle(
                                    "custom",
                                    customCanvasBackgroundColor,
                                    customEnd,
                                  )}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {canvasBackgroundId === "custom" ? (
                        <div className="space-y-3 rounded-xl border border-border/30 bg-background/55 p-3">
                          <OptionSegmentedControl
                            label="Fill style"
                            value={customCanvasGradientEnabled ? "gradient" : "solid"}
                            options={[
                              { id: "solid", label: "Solid" },
                              { id: "gradient", label: "Gradient" },
                            ]}
                            onChange={(id) => setCustomCanvasGradientEnabled(id === "gradient")}
                          />

                          <div
                            className="relative h-10 w-full overflow-hidden rounded-xl shadow-inner ring-1 ring-border/30"
                            style={resolveCanvasBackgroundStyle(
                              "custom",
                              customCanvasBackgroundColor,
                              customCanvasGradientEnabled ? customCanvasGradientEnd : undefined,
                            )}
                            aria-hidden
                          >
                            <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10" />
                          </div>

                          {customCanvasGradientEnabled ? (
                            <div className="grid grid-cols-2 gap-2">
                              <CompactColorInput
                                label="Start"
                                value={customCanvasBackgroundColor}
                                onChange={setCustomCanvasBackgroundColor}
                              />
                              <CompactColorInput
                                label="End"
                                value={customCanvasGradientEnd}
                                onChange={setCustomCanvasGradientEnd}
                              />
                            </div>
                          ) : (
                            <CompactColorInput
                              label="Color"
                              value={customCanvasBackgroundColor}
                              onChange={setCustomCanvasBackgroundColor}
                            />
                          )}
                        </div>
                      ) : null}
                    </SidebarCollapsibleSection>
                  </div>

                  {canvasImportNotice ? (
                    <p className="mt-3 shrink-0 border-t border-border/30 pt-3 text-[11px] leading-snug text-muted-foreground">
                      {canvasImportNotice}
                    </p>
                  ) : null}
                  <input
                    ref={canvasJsonInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleCanvasJsonFileChange}
                  />
                </>
              ) : leftPanelTab === "uploads" ? (
                <PhotoStudioUploadsPanel
                  uploads={workspaceUploads}
                  loading={uploadsLoading}
                  error={uploadsError}
                  uploading={assetUploading}
                  onOpenLibrary={onOpenLibrary}
                  onUploadFile={onUploadImageFile}
                  onSelectUpload={handleSelectWorkspaceUpload}
                />
              ) : leftPanelTab === "designs" ? (
                <>
                  <div className="relative mb-3 shrink-0">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      role="searchbox"
                      value={designSearchQuery}
                      onChange={(event) => setDesignSearchQuery(event.target.value)}
                      placeholder="Search templates…"
                      aria-label="Search templates"
                      className="h-9 w-full rounded-lg border border-border/60 bg-background/80 pl-8 pr-8 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                    {designSearchQuery ? (
                      <button
                        type="button"
                        onClick={() => setDesignSearchQuery("")}
                        aria-label="Clear search"
                        className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                    {designsLoading ? (
                      <DesignsPanelSkeleton />
                    ) : (
                      <div className="space-y-4">
                        {savedDesigns.some((design) => design.source === "user") ? (
                          <section>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Your saved designs
                            </p>
                            <OwnDesignsGrid
                              items={savedDesigns.filter((design) => design.source === "user")}
                              searchQuery={designSearchQuery}
                              filterAspectRatio={aspectRatio}
                              activeId={activeSavedDesignId}
                              onSelect={loadSavedDesign}
                              onDelete={deleteSavedDesign}
                            />
                          </section>
                        ) : null}
                        <section>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Templates
                          </p>
                          <OwnDesignsGrid
                            items={savedDesigns.filter((design) => design.source === "system")}
                            searchQuery={designSearchQuery}
                            filterAspectRatio={aspectRatio}
                            activeId={activeSavedDesignId}
                            onSelect={loadSavedDesign}
                            onDelete={deleteSavedDesign}
                          />
                        </section>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        AI generations
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {generatedItems.length} variant{generatedItems.length === 1 ? "" : "s"} from Prompt
                      </p>
                    </div>
                    {generatedItems.length > 0 ? (
                      <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-white/[0.08]">
                        {generatedItems.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                    {generationsLoading || isGenerating ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: studioOptions.batchSize }).map((_, index) => (
                          <div
                            key={index}
                            className="aspect-square animate-pulse rounded-xl bg-muted/40 dark:bg-white/[0.06]"
                          />
                        ))}
                      </div>
                    ) : (
                      <GeneratedItemsGrid
                        items={generatedItems}
                        selectedId={selectedGenerationId}
                        materializedId={materializedGenerationId}
                        onSelect={(item) => void applyGenerationToCanvas(item)}
                        onDelete={onDeleteGeneration ? handleDeleteGenerationItem : undefined}
                        deletingId={deletingGenerationId}
                        creationTypeLabels={creationTypeLabels}
                      />
                    )}
                  </div>
                  {isGenerationMaterialized ? (
                    <p className="mt-2 shrink-0 text-[10px] leading-relaxed text-muted-foreground">
                      Layers are on the canvas. Select shapes and text to edit colors, corner radius, and
                      typography. Change the preview background in Assets.
                    </p>
                  ) : null}
                </>
              )}
          </div>
        </aside>
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        {leftSidebarCollapsed ? (
          <WorkspaceSidebarExpandButton onClick={() => setLeftSidebarCollapsed(false)} />
        ) : null}

        <div className="shrink-0 border-b border-border/30 bg-white/95 px-4 py-2 backdrop-blur-xl dark:bg-background md:px-5">
          <div className="flex items-end gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <Layers className="h-4 w-4" />
            </span>
            <div className="flex min-h-[2.625rem] min-w-0 flex-1 flex-col items-start justify-end gap-0.5">
              {!isEditingWorkspaceTitle ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">{canvasAspectRatio}</span>
                  <span aria-hidden> · </span>
                  {isGenerationMaterialized
                    ? "Editable layers"
                    : hasCanvasEdits
                      ? canvasDesign.navbarEditingStatus
                      : showAiGeneratedLogo
                        ? "Transparent logo"
                        : selectedGeneration
                          ? selectedGeneration.label
                          : canvasDesign.navbarStatus}
                </p>
              ) : null}
              {isEditingWorkspaceTitle ? (
                <input
                  ref={workspaceTitleInputRef}
                  type="text"
                  value={workspaceTitleDraft}
                  onChange={(event) => setWorkspaceTitleDraft(event.target.value)}
                  onBlur={commitWorkspaceTitleEdit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitWorkspaceTitleEdit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelWorkspaceTitleEdit();
                    }
                  }}
                  placeholder="Untitled project"
                  aria-label="Project name"
                  size={Math.max(12, workspaceTitleDraft.length + 1)}
                  className="block w-auto min-w-[10ch] max-w-full border-0 border-b border-black/[0.12] bg-transparent p-0 pb-px text-sm font-semibold tracking-tight text-foreground shadow-none outline-none ring-0 [field-sizing:content] placeholder:font-semibold placeholder:text-muted-foreground/60 focus:border-primary focus:ring-0 dark:border-white/[0.2]"
                />
              ) : (
                <p
                  className="max-w-full cursor-text truncate text-sm font-semibold tracking-tight text-foreground"
                  title="Double-click to rename"
                  onDoubleClick={beginWorkspaceTitleEdit}
                >
                  {workspaceTitle}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 self-center">
              {onSaveWorkspace ? (
                <button
                  type="button"
                  onClick={onSaveWorkspace}
                  disabled={isSavingWorkspace}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-3",
                    workspacePersisted && !hasUnsavedWorkspaceChanges
                      ? "border-border/30 bg-muted/40 text-muted-foreground"
                      : "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15",
                  )}
                  aria-label="Save project"
                  title="Save project to your library and recents"
                >
                  {isSavingWorkspace ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden md:inline">
                    {isSavingWorkspace
                      ? "Saving…"
                      : workspacePersisted && !hasUnsavedWorkspaceChanges
                        ? "Saved"
                        : "Save project"}
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleExportCanvas("transparent")}
                disabled={isExporting || !hasExportableCanvasContent}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border/30 bg-background px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
                aria-label={`Export ${canvasDesign.exportTransparentLabel.toLowerCase()}`}
                title={
                  hasExportableCanvasContent
                    ? "Export shapes, text, and strokes without background"
                    : "Add content to the canvas first"
                }
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden md:inline">{canvasDesign.exportTransparentLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleExportCanvas("composite")}
                disabled={isExporting || !hasExportableCanvasContent}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border/30 bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Export canvas with background"
                title={
                  !hasExportableCanvasContent ? "Add content to the canvas first" : undefined
                }
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Export mockup</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className={cn("relative min-h-0 min-w-0 flex-1 overflow-auto", canvasWorkspaceClasses)}>
            <CanvasZoomControls
              zoom={canvasZoom}
              onZoomIn={handleCanvasZoomIn}
              onZoomOut={handleCanvasZoomOut}
              onReset={handleCanvasZoomReset}
            />
            <div className="flex min-h-full w-full items-center justify-center p-8 md:p-12 lg:p-14">
              <div
                className="relative shrink-0"
                style={
                  canvasZoomContentSize.width > 0 && canvasZoomContentSize.height > 0
                    ? {
                        width: canvasZoomContentSize.width * canvasZoom,
                        height: canvasZoomContentSize.height * canvasZoom,
                      }
                    : undefined
                }
              >
                <div
                  ref={canvasZoomContentRef}
                  className={cn(
                    "flex max-w-5xl flex-col items-center gap-3",
                    canvasZoomContentSize.width <= 0 && "w-full",
                  )}
                  style={{
                    width:
                      canvasZoomContentSize.width > 0 ? canvasZoomContentSize.width : undefined,
                    transform: `scale(${canvasZoom})`,
                    transformOrigin: "top left",
                  }}
                >
                <div className="flex flex-wrap items-center justify-center gap-2 px-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 px-3 py-1 text-[10px] font-semibold tabular-nums text-foreground shadow-[0_1px_4px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/[0.12] dark:bg-white/[0.1]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/90" />
                    {canvasAspectRatio}
                  </span>
                  <span className="rounded-full border border-black/[0.06] bg-white/80 px-3 py-1 text-[10px] font-medium text-muted-foreground shadow-[0_1px_4px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/[0.1] dark:bg-white/[0.08]">
                    {canvasDesign.navbarStatus}
                  </span>
                </div>

                <div
                  className={cn(
                    "relative w-full transition-all duration-200",
                    canvasAspectRatio === "1:1" && "max-w-[min(100%,520px)]",
                    canvasAspectRatio === "4:5" && "max-w-[min(100%,420px)]",
                    canvasAspectRatio === "16:9" && "max-w-full",
                    canvasAspectRatio === "9:16" && "max-w-[min(100%,320px)]",
                    canvasDragOver &&
                      "ring-2 ring-primary/35 ring-offset-4 ring-offset-muted/30 dark:ring-offset-background/80",
                  )}
                >
                  <div className="canvas-artboard-frame overflow-hidden">
                    <div
                      ref={canvasRef}
                      data-canvas-surface=""
                      onDragOver={handleCanvasDragOver}
                      onDragLeave={handleCanvasDragLeave}
                      onDrop={handleCanvasDrop}
                      onDoubleClick={handleCanvasPlaceText}
                      className={cn(
                        "relative w-full overflow-hidden bg-white dark:bg-card [container-type:inline-size]",
                        canvasAspectRatio === "1:1" && "aspect-square",
                        canvasAspectRatio === "4:5" && "aspect-[4/5]",
                        canvasAspectRatio === "16:9" && "aspect-video",
                        canvasAspectRatio === "9:16" && "aspect-[9/16]",
                      )}
                      style={canvasSurfaceStyle}
                    >
                {isGenerating ? (
                  <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 p-6 text-center dark:bg-background/80">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mt-4 text-sm font-semibold text-foreground">Generating visuals…</p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      {creationType === "logo" && logoTransparentBackground
                        ? "Creating transparent logo variants for your canvas."
                        : "New variants will appear in the Assets panel when ready."}
                    </p>
                  </div>
                ) : showAiGeneratedLogo && selectedGeneration ? (
                  <GeneratedLogoPreview
                    prompt={selectedGeneration.prompt}
                    variantIndex={selectedGeneration.variantIndex ?? 0}
                  />
                ) : showStandardGenerationPreview && selectedGeneration ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 z-0 flex flex-col justify-end bg-gradient-to-br p-6",
                      selectedGeneration.previewGradient,
                    )}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_42%)]" />
                    <div className="relative rounded-xl bg-black/35 p-4 text-white backdrop-blur-sm">
                      <p className="text-sm font-semibold">{selectedGeneration.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-white/85">{selectedGeneration.prompt}</p>
                    </div>
                  </div>
                ) : showEmptyCanvasOverlay ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-black/[0.12] bg-white/60 text-stone-500 shadow-sm backdrop-blur-sm dark:border-white/[0.2] dark:bg-white/[0.06] dark:text-zinc-400">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {canvasDesign.title}
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {canvasDesign.emptyDescription}
                    </p>
                  </div>
                ) : null}

                {canvasShapes.length > 0 ? (
                  <div
                    className={cn(
                      "absolute inset-0 z-20",
                      blockShapeInteraction && "pointer-events-none",
                    )}
                  >
                    <PhotoStudioShapeStage
                      shapes={canvasShapes}
                      canvasSize={canvasPixelSize}
                      selectedIds={selectedShapeIds}
                      selectable={canSelectShapes}
                      movable={canDragShapes}
                      resizable={canResizeShapes}
                      textEditable={canEditShapeText}
                      editingTextId={editingShapeTextId}
                      stageRef={shapeStageRef}
                      onSelect={(id, additive) => {
                        selectCanvasShape(id, additive);
                        focusSelectionToolbar();
                      }}
                      onClearSelection={() => {
                        if (canSelectShapes) {
                          clearShapeSelection();
                        }
                        if (canSelectTexts) {
                          setSelectedTextId(null);
                          setEditingTextId(null);
                        }
                      }}
                      onMove={moveCanvasShape}
                      onTransform={transformCanvasShape}
                      onLinePointsChange={updateLinePointsShape}
                      onStartEditText={(id) => {
                        setSelectedShapeIds([id]);
                        setSelectedTextId(null);
                        setEditingTextId(null);
                        setEditingShapeTextId(id);
                        focusSelectionToolbar();
                      }}
                      onCommitLabel={(id, label) => {
                        updateShapeLabel(id, label);
                        setEditingShapeTextId(null);
                      }}
                      onCancelEditText={() => setEditingShapeTextId(null)}
                      onSelectionBoundsChange={setSelectionBounds}
                    />
                  </div>
                ) : null}

                {canSelectShapes &&
                selectedShapes.length > 0 &&
                !editingShapeTextId &&
                selectionPanelAnchor ? (
                  <div className="pointer-events-none absolute inset-0 z-[35] overflow-hidden">
                    <PhotoStudioCanvasSelectionPanel
                      anchor={selectionPanelAnchor}
                      canvasHostRef={canvasRef}
                      selectionCount={selectedShapes.length}
                      canGroup={canGroupSelection}
                      canUngroup={canUngroupSelection}
                      moreOpen={selectionPanelMoreOpen}
                      onMoreOpenChange={setSelectionPanelMoreOpen}
                      onDuplicate={duplicateSelectedShapes}
                      onGroup={groupSelectedShapes}
                      onUngroup={ungroupSelectedShapes}
                      onDelete={() =>
                        deleteCanvasShape(selectedShapeId ?? selectedShapeIds[0] ?? "")
                      }
                    />
                  </div>
                ) : null}

                <div
                  className={cn(
                    "absolute inset-0 z-10",
                    isCanvasElementToolActive && "pointer-events-none",
                  )}
                  onPointerDown={(event) => {
                    if (
                      activeTool === "select" &&
                      canSelectTexts &&
                      event.target === event.currentTarget
                    ) {
                      setSelectedTextId(null);
                      setEditingTextId(null);
                    }
                  }}
                >
                  {canvasTexts.map((text) => (
                    <CanvasTextItem
                      key={text.id}
                      text={text}
                      fontStyle={getFontStyleById(text.fontStyleId)}
                      selected={selectedTextId === text.id}
                      selectable={canSelectTexts}
                      movable={canDragTexts}
                      resizable={canResizeTexts}
                      editable={canEditCanvasText}
                      isEditing={editingTextId === text.id}
                      canvasRef={canvasRef}
                      onSelect={() => {
                        setSelectedTextId(text.id);
                        clearShapeSelection();
                        setEditingShapeTextId(null);
                        setEditingTextId(null);
                        focusSelectionToolbar();
                      }}
                      onMove={moveCanvasText}
                      onResize={resizeCanvasText}
                      onStartEdit={() => setEditingTextId(text.id)}
                      onEndEdit={() => setEditingTextId(null)}
                      onUpdateContent={updateTextContent}
                      onRemoveIfEmpty={removeCanvasTextIfEmpty}
                    />
                  ))}
                </div>

                <CanvasPaintLayer
                  paintCanvasRef={paintCanvasRef}
                  mode={drawingToolMode}
                  eraserPreviewPoint={eraserPreviewPoint}
                  eraserSize={eraserSettings.size}
                  onPointerDown={handlePaintPointerDown}
                  onPointerMove={handlePaintPointerMove}
                  onPointerUp={handlePaintPointerUp}
                />
                    </div>
                  </div>
                </div>

                <p className="max-w-sm px-4 text-center text-[10px] leading-relaxed text-muted-foreground/75">
                  {hasCanvasEdits ? canvasDesign.previewHintActive : canvasDesign.previewHintIdle}
                </p>
                </div>
              </div>
            </div>
          </div>

          {renderToolsPanel()}
        </div>
      </div>
    </div>
  );
}

export function PhotoStudioApp({
  assetId,
  assetName,
  assetImageUrl,
  workspaceId,
  initialWorkspaceSnapshot,
  initialView = "home",
  recentProjects = [],
  onOpenRecentProject,
  formatRecentTime,
  onOpenLibrary,
  onUploadAsset,
  onOpenEmptyWorkspace,
  onResetDraftWorkspace,
  onNewWorkspace,
  workspaceTabs,
  activeWorkspaceTabId,
  onSelectWorkspaceTab,
  onCloseWorkspaceTab,
  onNewWorkspaceTab,
  isPreparingNewWorkspaceTab = false,
  workspaceSessionKey = 0,
  onWorkspaceSnapshotChange,
  onLoadDesigns,
  onSaveWorkspace,
  isSavingWorkspace = false,
  workspacePersisted = false,
  hasUnsavedWorkspaceChanges = false,
  photoStudioOptions,
  onDeleteGeneration,
  onDeleteRecentProject,
  onFetchGeneration,
  generationsLoading = false,
  initialGenerationsFromApi = [],
  onGenerate,
  generating = false,
  assetUploading = false,
  assetUploadProgress,
  assetUploadError,
  onOpenHelp,
  resumedFromLibrary: initialResumedFromLibrary = false,
  canvasDraftId,
  loadExportedCanvasJson,
  workspaceUploads = [],
  uploadsLoading = false,
  uploadsError,
  onSelectWorkspaceUpload,
  onRefreshWorkspaceUploads,
  onUploadImageFile,
}: PhotoStudioAppProps) {
  const hasAsset = Boolean(assetId);
  const [resumedFromLibrary, setResumedFromLibrary] = useState(initialResumedFromLibrary);
  const [activeView, setActiveView] = useState<PhotoStudioView>(
    initialView === "workspace" || hasAsset ? "workspace" : "home",
  );
  const canvasFileActionsRef = useRef<PhotoStudioCanvasFileActions | null>(null);
  const pendingCanvasFileActionRef = useRef<"openJson" | "restore" | null>(null);
  const [isPreparingWorkspace, setIsPreparingWorkspace] = useState(false);
  const [draftSessionActive, setDraftSessionActive] = useState(
    initialView === "workspace" || hasAsset || Boolean(workspaceId),
  );
  const hasStartedDraftRef = useRef(
    initialView === "workspace" || hasAsset || Boolean(workspaceId),
  );

  useEffect(() => {
    if (workspaceId || hasAsset || initialView === "workspace") {
      setDraftSessionActive(true);
      hasStartedDraftRef.current = true;
    }
  }, [workspaceId, hasAsset, initialView]);

  useEffect(() => {
    if (hasAsset || initialView === "workspace") {
      setActiveView("workspace");
      return;
    }
    if (initialView === "home") {
      setActiveView("home");
    }
  }, [assetId, hasAsset, initialView]);

  useEffect(() => {
    setResumedFromLibrary(initialResumedFromLibrary);
  }, [initialResumedFromLibrary]);

  const defaultFormatRecentTime =
    formatRecentTime ??
    ((openedAt: number) =>
      new Date(openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }));

  const showWorkspaceView = () => {
    setResumedFromLibrary(false);
    setDraftSessionActive(true);
    setActiveView("workspace");
  };

  const registerCanvasFileActions = useCallback((actions: PhotoStudioCanvasFileActions | null) => {
    canvasFileActionsRef.current = actions;
    if (!actions || !pendingCanvasFileActionRef.current) return;
    const pending = pendingCanvasFileActionRef.current;
    pendingCanvasFileActionRef.current = null;
    if (pending === "openJson") actions.openCanvasJsonFile();
    else void actions.restoreExportedCanvasJson();
  }, []);

  const runCanvasFileAction = useCallback((kind: "openJson" | "restore") => {
    showWorkspaceView();
    const actions = canvasFileActionsRef.current;
    if (actions) {
      if (kind === "openJson") actions.openCanvasJsonFile();
      else void actions.restoreExportedCanvasJson();
      return;
    }
    pendingCanvasFileActionRef.current = kind;
  }, []);

  const handleSelectWorkspaceTab = (tabId: string) => {
    showWorkspaceView();
    onSelectWorkspaceTab?.(tabId);
  };

  const handleOpenRecentProject = (project: RecentPhotoProject) => {
    showWorkspaceView();
    onOpenRecentProject?.(project);
  };

  const handleNewWorkspace = async () => {
    if (isPreparingWorkspace) return;

    if (onNewWorkspaceTab) {
      onNewWorkspaceTab();
      setResumedFromLibrary(false);
      setDraftSessionActive(true);
      setActiveView("workspace");
      return;
    }

    const resetDraft = onResetDraftWorkspace ?? onOpenEmptyWorkspace;

    if (activeView === "workspace" && draftSessionActive && !workspacePersisted) {
      return;
    }

    if (draftSessionActive && !workspacePersisted && activeView !== "workspace") {
      setActiveView("workspace");
      setResumedFromLibrary(false);
      return;
    }

    const isFirstDraftStart = !hasStartedDraftRef.current;

    if (isFirstDraftStart) {
      setIsPreparingWorkspace(true);
    }

    try {
      if (isFirstDraftStart) {
        await Promise.all([
          Promise.resolve(resetDraft?.()),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, WORKSPACE_PREPARE_DELAY_MS);
          }),
        ]);
        hasStartedDraftRef.current = true;
      } else if (workspacePersisted || workspaceId) {
        await Promise.resolve(resetDraft?.());
      }

      setResumedFromLibrary(false);
      setDraftSessionActive(true);
      setActiveView("workspace");
    } finally {
      setIsPreparingWorkspace(false);
    }
  };

  const moreMenuItems = useMemo((): PhotoStudioMoreMenuItem[] => {
    const items: PhotoStudioMoreMenuItem[] = [
      {
        id: "library",
        label: "Open from library",
        description: `Browse ${PHOTO_STUDIO_IMAGE_FORMATS_LABEL} images from your library.`,
        icon: FolderOpen,
        onClick: () => onOpenLibrary?.(),
        disabled: !onOpenLibrary,
      },
      {
        id: "upload",
        label: hasAsset ? "Replace image" : "Upload image",
        description: `Pick a ${PHOTO_STUDIO_IMAGE_FORMATS_LABEL} image from your device.`,
        icon: Upload,
        onClick: () => onUploadAsset?.(),
        disabled: !onUploadAsset,
        loading: assetUploading,
      },
      {
        id: "canvas-json",
        label: "Open canvas JSON…",
        description: "Import shapes and text from a canvas export file.",
        icon: FileJson,
        onClick: () => runCanvasFileAction("openJson"),
      },
    ];
    if (loadExportedCanvasJson) {
      items.push({
        id: "restore-export",
        label: "Restore last export",
        description: "Reload the most recent auto-saved canvas layers.",
        icon: RotateCcw,
        onClick: () => runCanvasFileAction("restore"),
      });
    }
    return items;
  }, [
    assetUploading,
    hasAsset,
    loadExportedCanvasJson,
    onOpenLibrary,
    onUploadAsset,
    runCanvasFileAction,
  ]);

  const handleHomeClick = () => {
    setResumedFromLibrary(false);
    setActiveView("home");
  };

  const showWorkspaceChrome =
    Boolean(
      workspaceTabs &&
        activeWorkspaceTabId &&
        onSelectWorkspaceTab &&
        onCloseWorkspaceTab &&
        onNewWorkspaceTab,
    );

  return (
    <div className="home-warm-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {showWorkspaceChrome ? (
        <PhotoStudioWorkspaceChrome
          tabs={workspaceTabs ?? []}
          activeTabId={activeWorkspaceTabId!}
          onSelectTab={handleSelectWorkspaceTab}
          onCloseTab={onCloseWorkspaceTab!}
          onNewTab={() => void handleNewWorkspace()}
          isPreparingNew={isPreparingNewWorkspaceTab || isPreparingWorkspace}
          homeSelected={activeView === "home"}
          onHomeClick={handleHomeClick}
          moreMenuItems={moreMenuItems}
          onOpenHelp={onOpenHelp}
        />
      ) : (
        <header className="relative z-[110] flex h-11 shrink-0 items-center border-b border-black/[0.06] bg-white/70 px-4 backdrop-blur-md dark:border-white/[0.12] dark:bg-card/70">
          <nav className="flex flex-1 items-center" aria-label="Clovai Canvas navigation">
            <div className="inline-flex items-center rounded-full border border-black/[0.06] bg-white/60 p-0.5 dark:border-white/[0.12] dark:bg-white/[0.06]">
              <button
                type="button"
                aria-label="Home"
                title="Projects and recent work"
                onClick={handleHomeClick}
                className={cn(
                  "relative flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all",
                  activeView === "home"
                    ? "bg-white text-foreground shadow-[0_1px_4px_rgba(15,23,42,0.08)] dark:bg-white/[0.14]"
                    : "text-muted-foreground/70 hover:text-foreground",
                )}
              >
                <Home className="h-3.5 w-3.5 shrink-0" strokeWidth={activeView === "home" ? 2.25 : 2} />
                <span className="hidden sm:inline">Home</span>
              </button>
              {moreMenuItems.length > 0 ? (
                <PhotoStudioNavMoreMenu items={moreMenuItems} />
              ) : null}
            </div>
          </nav>
          <button
            type="button"
            onClick={() => onOpenHelp?.()}
            disabled={!onOpenHelp}
            title="Help"
            aria-label="Help"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
          >
            <CircleHelp className="h-4 w-4" strokeWidth={2} />
          </button>
        </header>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isPreparingWorkspace ? (
        <PhotoStudioWorkspaceShimmer label="Preparing new workspace…" />
      ) : (
        <>
          {activeView === "home" ? (
            <PhotoStudioHome
              recentProjects={recentProjects}
              onOpenRecentProject={handleOpenRecentProject}
              onDeleteRecentProject={onDeleteRecentProject}
              formatRecentTime={defaultFormatRecentTime}
            />
          ) : null}
          {assetUploadError && activeView === "home" ? (
            <p className="mx-auto max-w-6xl px-4 pb-4 text-sm text-destructive md:px-8">{assetUploadError}</p>
          ) : null}
          {draftSessionActive ? (
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden",
                activeView !== "workspace" && "hidden",
              )}
            >
              <PhotoStudioWorkspace
                key={activeWorkspaceTabId ?? `${workspaceSessionKey}-${workspaceId ?? "draft"}`}
                assetId={assetId}
                assetName={assetName}
                assetImageUrl={assetImageUrl}
                workspaceId={workspaceId}
                workspaceTabId={activeWorkspaceTabId ?? undefined}
                initialWorkspaceSnapshot={initialWorkspaceSnapshot}
                onWorkspaceSnapshotChange={onWorkspaceSnapshotChange}
                onLoadDesigns={onLoadDesigns}
                onSaveWorkspace={onSaveWorkspace}
                isSavingWorkspace={isSavingWorkspace}
                workspacePersisted={workspacePersisted}
                hasUnsavedWorkspaceChanges={hasUnsavedWorkspaceChanges}
                photoStudioOptions={photoStudioOptions}
                onDeleteGeneration={onDeleteGeneration}
                onFetchGeneration={onFetchGeneration}
                generationsLoading={generationsLoading}
                initialGenerationsFromApi={initialGenerationsFromApi}
                onGenerate={onGenerate}
                generating={generating}
                assetUploading={assetUploading}
                canvasDraftId={canvasDraftId}
                loadExportedCanvasJson={loadExportedCanvasJson}
                onRegisterCanvasFileActions={registerCanvasFileActions}
                workspaceUploads={workspaceUploads}
                uploadsLoading={uploadsLoading}
                uploadsError={uploadsError}
                onSelectWorkspaceUpload={onSelectWorkspaceUpload}
                onRefreshWorkspaceUploads={onRefreshWorkspaceUploads}
                onOpenLibrary={onOpenLibrary}
                onUploadImageFile={onUploadImageFile}
              />
            </div>
          ) : null}
        </>
      )}
      </div>
    </div>
  );
}
