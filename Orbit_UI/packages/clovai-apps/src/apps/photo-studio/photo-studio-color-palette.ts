export type PhotoStudioColorPaletteGroup = {
  name: string;
  swatches: string[];
};

/** Shared swatch groups used by shape colors, canvas fill, and brush tools. */
export const photoStudioColorPaletteGroups: PhotoStudioColorPaletteGroup[] = [
  {
    name: "Neutrals",
    swatches: [
      "#ffffff",
      "#f8fafc",
      "#f1f5f9",
      "#e2e8f0",
      "#94a3b8",
      "#64748b",
      "#475569",
      "#1e293b",
      "#0f172a",
      "#000000",
    ],
  },
  {
    name: "Studio violet",
    swatches: ["#ede9fe", "#c4b5fd", "#8b5cf6", "#7c3aed", "#6d28d9", "#4f46e5", "#6366f1", "#a855f7"],
  },
  {
    name: "Ocean & sky",
    swatches: ["#ecfeff", "#67e8f9", "#06b6d4", "#0891b2", "#0ea5e9", "#2563eb", "#0284c7", "#14b8a6"],
  },
  {
    name: "Warm glow",
    swatches: ["#fef3c7", "#fde68a", "#fbbf24", "#f59e0b", "#f97316", "#ef4444", "#f43f5e", "#ec4899"],
  },
  {
    name: "Earth & green",
    swatches: ["#dcfce7", "#86efac", "#22c55e", "#10b981", "#059669", "#047857", "#166534", "#14532d"],
  },
];

export const photoStudioQuickColorSwatches = photoStudioColorPaletteGroups.flatMap((group) => group.swatches);

export function normalizeHexColor(input: string): string | null {
  const cleaned = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return `#${cleaned.toLowerCase()}`;
}

export function hexColorsMatch(a: string, b: string): boolean {
  return normalizeHexColor(a) === normalizeHexColor(b);
}

export function isLightHexColor(hex: string): boolean {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return false;
  const rgb = normalized.replace("#", "");
  const red = Number.parseInt(rgb.slice(0, 2), 16);
  const green = Number.parseInt(rgb.slice(2, 4), 16);
  const blue = Number.parseInt(rgb.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.72;
}

export function getReadableColorInputValue(value: string, fallback = "#7c3aed"): string {
  return normalizeHexColor(value) ?? fallback;
}
