"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { AlertCircle, Loader2 } from "lucide-react";

import { normalizeMermaidSource } from "@/lib/normalize-mermaid-source";
import { cn } from "@/lib/utils";

type PlanMermaidDiagramProps = {
  source: string;
  className?: string;
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

export function PlanMermaidDiagram({ source, className }: PlanMermaidDiagramProps) {
  const renderId = useId().replace(/:/g, "");
  const attemptRef = useRef(0);
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);

  const diagramSource = normalizeMermaidSource(source);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      if (!diagramSource.trim()) {
        setSvg("");
        setError("No Mermaid diagram source to render.");
        setRendering(false);
        return;
      }

      setRendering(true);
      setError(null);

      try {
        const mermaid = await getMermaid(resolvedTheme === "dark" ? "dark" : "neutral");
        const uniqueId = `plan-mermaid-${renderId}-${attemptRef.current++}`;
        const { svg: rendered } = await mermaid.render(uniqueId, diagramSource);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setSvg("");
          setError(cause instanceof Error ? cause.message : "Failed to render Mermaid diagram");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [diagramSource, renderId, resolvedTheme]);

  if (rendering) {
    return (
      <div
        className={cn(
          "flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Rendering diagram…
      </div>
    );
  }

  if (error || !svg) {
    return (
      <div className={cn("flex min-h-[200px] flex-col gap-3 px-4 py-4 sm:px-5", className)}>
        <div className="flex items-start gap-2 text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Could not render diagram</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error ?? "Mermaid returned an empty result. Edit the source below and fix syntax."}
            </p>
          </div>
        </div>
        <pre className="max-h-48 overflow-auto rounded-sm border border-border/60 bg-muted/15 p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
          {diagramSource}
        </pre>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "plan-mermaid-diagram flex min-h-[240px] w-full items-center justify-center overflow-x-auto p-4",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
