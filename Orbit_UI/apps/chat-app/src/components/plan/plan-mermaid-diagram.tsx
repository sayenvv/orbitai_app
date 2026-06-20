"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { AlertCircle, Loader2 } from "lucide-react";

import { normalizeMermaidSource } from "@/lib/normalize-mermaid-source";
import { cn } from "@/lib/utils";

type PlanMermaidDiagramProps = {
  source: string;
  className?: string;
  theme?: "dark" | "neutral";
  onRendered?: () => void;
};

let mermaidInitPromise: Promise<typeof import("mermaid").default> | null = null;

async function getMermaid(theme: "dark" | "neutral") {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import("mermaid").then((mod) => {
      mod.default.initialize({
        startOnLoad: false,
        theme,
        securityLevel: "loose",
        fontFamily: "inherit",
        suppressErrorRendering: true,
      });
      return mod.default;
    });
  }

  const mermaid = await mermaidInitPromise;
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: "loose",
    fontFamily: "inherit",
    suppressErrorRendering: true,
  });
  return mermaid;
}

function normalizeRenderedSvg(svg: string): string {
  if (typeof DOMParser === "undefined") return svg;

  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement as SVGSVGElement;
  if (root.tagName.toLowerCase() !== "svg") return svg;

  const viewBox = root.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    root.setAttribute("width", String(viewBox.width));
    root.setAttribute("height", String(viewBox.height));
  }

  root.removeAttribute("style");
  root.style.maxWidth = "none";
  root.style.display = "block";

  return root.outerHTML;
}

export function PlanMermaidDiagram({ source, className, theme, onRendered }: PlanMermaidDiagramProps) {
  const renderId = useId().replace(/:/g, "");
  const attemptRef = useRef(0);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const onRenderedRef = useRef(onRendered);
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);

  const diagramSource = normalizeMermaidSource(source);

  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  useEffect(() => {
    let cancelled = false;
    const host = svgHostRef.current;
    if (host) host.innerHTML = "";

    async function renderDiagram() {
      if (!diagramSource.trim()) {
        setError("No Mermaid diagram source to render.");
        setRendering(false);
        return;
      }

      setRendering(true);
      setError(null);

      try {
        const mermaidTheme = theme ?? (resolvedTheme === "dark" ? "dark" : "neutral");
        const mermaid = await getMermaid(mermaidTheme);
        const uniqueId = `plan-mermaid-${renderId}-${attemptRef.current++}`;
        const { svg: rendered } = await mermaid.render(uniqueId, diagramSource);
        if (cancelled || !svgHostRef.current) return;

        svgHostRef.current.innerHTML = normalizeRenderedSvg(rendered);
        setError(null);
        setRendering(false);
        window.requestAnimationFrame(() => {
          onRenderedRef.current?.();
        });
      } catch (cause) {
        if (!cancelled) {
          if (svgHostRef.current) svgHostRef.current.innerHTML = "";
          setError(cause instanceof Error ? cause.message : "Failed to render Mermaid diagram");
          setRendering(false);
        }
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [diagramSource, renderId, resolvedTheme, theme]);

  return (
    <div className={cn("plan-mermaid-diagram-host relative", className)}>
      {rendering ? (
        <div className="flex min-h-[120px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Rendering diagram…
        </div>
      ) : null}

      {!rendering && error ? (
        <div className="flex min-h-[120px] flex-col gap-3 py-4">
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Could not render diagram</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
          <pre className="max-h-48 overflow-auto rounded-sm border border-border/60 bg-muted/15 p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
            {diagramSource}
          </pre>
        </div>
      ) : null}

      <div
        ref={svgHostRef}
        className={cn(
          "plan-mermaid-diagram w-fit max-w-none overflow-visible",
          (rendering || error) && "hidden",
        )}
      />
    </div>
  );
}
