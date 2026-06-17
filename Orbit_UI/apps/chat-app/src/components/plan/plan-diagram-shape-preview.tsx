"use client";

import type { PlanDiagramCanvasNodeType } from "@/lib/plan-diagram-canvas-mermaid";
import type { PlanDiagramShapePreset } from "@/lib/plan-diagram-shape-catalog";
import { cn } from "@/lib/utils";

const STROKE = "currentColor";
const FILL = "rgba(255,255,255,0.95)";

function PreviewSvg({
  type,
  accentColor,
  className,
}: {
  type: PlanDiagramCanvasNodeType;
  accentColor?: string;
  className?: string;
}) {
  const w = 40;
  const h = 32;

  if (type === "brand" && accentColor) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="4" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
        <rect x="2" y="2" width={w - 4} height="10" rx="4" fill={accentColor} />
        <rect x="2" y="8" width={w - 4} height="4" fill={accentColor} />
      </svg>
    );
  }

  switch (type) {
    case "circle":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <circle cx={w / 2} cy={h / 2} r="13" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <polygon
            points={`${w / 2},3 ${w - 3},${h / 2} ${w / 2},${h - 3} 3,${h / 2}`}
            fill={FILL}
            stroke={STROKE}
            strokeWidth="1.5"
          />
        </svg>
      );
    case "hexagon":
    case "shield":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <polygon
            points={
              type === "shield"
                ? `${w / 2},2 ${w - 2},10 ${w - 2},20 ${w / 2},${h - 2} 2,20 2,10`
                : `${w / 2},2 ${w - 4},9 ${w - 4},23 ${w / 2},${h - 2} 4,23 4,9`
            }
            fill={FILL}
            stroke={STROKE}
            strokeWidth="1.5"
          />
        </svg>
      );
    case "parallelogram":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <polygon points={`10,3 ${w - 2},3 ${w - 10},${h - 3} 2,${h - 3}`} fill={FILL} stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "cloud":
    case "rounded":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <ellipse cx={w / 2} cy={h / 2} rx="17" ry="12" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "database":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <ellipse cx={w / 2} cy="9" rx="14" ry="5" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
          <rect x="6" y="9" width={w - 12} height="14" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
          <ellipse cx={w / 2} cy="23" rx="14" ry="5" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "document":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <rect x="4" y="2" width={w - 8} height={h - 4} rx="3" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
          <polyline points={`${w - 10},2 ${w - 4},2 ${w - 4},10 ${w - 10},2`} fill="none" stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "queue":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <rect x="3" y="5" width="26" height={h - 10} fill={FILL} stroke={STROKE} strokeWidth="1.5" />
          <polyline points="29,5 35,10 29,15 35,20 29,25 35,30 29,35" fill="none" stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "actor":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <circle cx={w / 2} cy="9" r="6" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
          <line x1={w / 2} y1="15" x2={w / 2} y2="26" stroke={STROKE} strokeWidth="1.5" />
          <line x1={w / 2} y1="26" x2="10" y2={h - 2} stroke={STROKE} strokeWidth="1.5" />
          <line x1={w / 2} y1="26" x2={w - 10} y2={h - 2} stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "api":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <rect x="4" y="5" width={w - 8} height={h - 10} rx="6" fill={FILL} stroke="#6366f1" strokeWidth="1.5" />
        </svg>
      );
    case "subroutine":
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <rect x="6" y="7" width={w - 12} height={h - 14} fill={FILL} stroke={STROKE} strokeWidth="1.5" />
          <rect x="3" y="4" width={w - 6} height={h - 8} fill="none" stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "rect":
    default:
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
          <rect x="4" y="6" width={w - 8} height={h - 12} rx="4" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
  }
}

export function ShapePreviewIcon({
  preset,
  className,
}: {
  preset: PlanDiagramShapePreset;
  className?: string;
}) {
  return (
    <PreviewSvg
      type={preset.nodeType}
      accentColor={preset.accentColor}
      className={cn("h-9 w-11 text-foreground/70", className)}
    />
  );
}
