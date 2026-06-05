"use client";

import { Check } from "lucide-react";

import { getReadableColorInputValue, hexColorsMatch, isLightHexColor, photoStudioColorPaletteGroups } from "./photo-studio-color-palette";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type PhotoStudioColorPaletteGridProps = {
  value: string | null;
  onSelect: (color: string) => void;
  swatchSize?: "sm" | "md";
  showGroupLabels?: boolean;
};

export function PhotoStudioColorPaletteGrid({
  value,
  onSelect,
  swatchSize = "md",
  showGroupLabels = true,
}: PhotoStudioColorPaletteGridProps) {
  const sizeClass = swatchSize === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div className="space-y-2.5">
      {photoStudioColorPaletteGroups.map((group) => (
        <div key={group.name}>
          {showGroupLabels ? (
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.name}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {group.swatches.map((color) => {
              const selected = value ? hexColorsMatch(value, color) : false;
              const checkOnDark = !isLightHexColor(color);
              return (
                <button
                  key={`${group.name}-${color}`}
                  type="button"
                  onClick={() => onSelect(getReadableColorInputValue(color))}
                  title={color}
                  aria-label={`Select color ${color}`}
                  aria-pressed={selected}
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-full border border-black/10 shadow-sm transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25",
                    sizeClass,
                    selected && "ring-2 ring-foreground/40 ring-offset-2 ring-offset-background scale-110",
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
                          swatchSize === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
                        )}
                        strokeWidth={3}
                      />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
