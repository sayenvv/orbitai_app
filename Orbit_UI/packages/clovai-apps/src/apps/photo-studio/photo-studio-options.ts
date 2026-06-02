import { Camera, ImagePlus, ShoppingBag, Wand2, type LucideIcon } from "lucide-react";

import type { PhotoStudioCreationType } from "./photo-studio-app";

export type PhotoStudioOptionsConfig = {
  creationTypes: Array<{ id: string; label: string; description: string }>;
  aspectRatios: Array<{ id: string; label: string; hint: string }>;
  stylePresets: Array<{ id: string; label: string }>;
  batchSize: number;
};

export type PhotoStudioCreationTypeOption = {
  id: PhotoStudioCreationType;
  label: string;
  description: string;
  icon: LucideIcon;
};

const creationTypeIcons: Record<PhotoStudioCreationType, LucideIcon> = {
  logo: Wand2,
  product: ShoppingBag,
  lifestyle: Camera,
  campaign: ImagePlus,
};

export const DEFAULT_PHOTO_STUDIO_OPTIONS: PhotoStudioOptionsConfig = {
  creationTypes: [
    {
      id: "logo",
      label: "Logo & brand",
      description: "Transparent PNG logos — preview on colorful backgrounds.",
    },
    {
      id: "product",
      label: "Product photo",
      description: "Clean studio shots and e-commerce visuals.",
    },
    {
      id: "lifestyle",
      label: "Lifestyle scene",
      description: "Editorial mockups and in-context photography.",
    },
    {
      id: "campaign",
      label: "Campaign visual",
      description: "Ads, banners, and social-ready creatives.",
    },
  ],
  aspectRatios: [
    { id: "1:1", label: "Square", hint: "Logo & brand mark" },
    { id: "4:5", label: "Portrait", hint: "Product & portrait" },
    { id: "16:9", label: "Landscape", hint: "Banner & hero" },
    { id: "9:16", label: "Story", hint: "Story & vertical" },
  ],
  stylePresets: [
    { id: "studio", label: "Studio clean" },
    { id: "editorial", label: "Editorial" },
    { id: "cinematic", label: "Cinematic" },
    { id: "minimal", label: "Minimal brand" },
  ],
  batchSize: 4,
};

export function resolvePhotoStudioOptions(
  input?: Partial<PhotoStudioOptionsConfig> | null,
): PhotoStudioOptionsConfig {
  if (!input) return DEFAULT_PHOTO_STUDIO_OPTIONS;
  return {
    creationTypes:
      input.creationTypes?.length ? input.creationTypes : DEFAULT_PHOTO_STUDIO_OPTIONS.creationTypes,
    aspectRatios:
      input.aspectRatios?.length ? input.aspectRatios : DEFAULT_PHOTO_STUDIO_OPTIONS.aspectRatios,
    stylePresets:
      input.stylePresets?.length ? input.stylePresets : DEFAULT_PHOTO_STUDIO_OPTIONS.stylePresets,
    batchSize: input.batchSize ?? DEFAULT_PHOTO_STUDIO_OPTIONS.batchSize,
  };
}

export function buildCreationTypeOptions(
  options: PhotoStudioOptionsConfig,
): PhotoStudioCreationTypeOption[] {
  return options.creationTypes
    .filter((item): item is { id: PhotoStudioCreationType; label: string; description: string } =>
      ["logo", "product", "lifestyle", "campaign"].includes(item.id),
    )
    .map((item) => ({
      ...item,
      icon: creationTypeIcons[item.id],
    }));
}

export function isAllowedAspectRatio(value: string, options: PhotoStudioOptionsConfig): boolean {
  return options.aspectRatios.some((ratio) => ratio.id === value);
}
