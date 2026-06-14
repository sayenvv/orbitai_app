"use client";

import { buildLineDiff, type DiffLine } from "@/lib/agent-change-diff";
import { cn } from "@/lib/utils";

type AgentChangeDiffViewProps = {
  filePath: string;
  previousContent: string;
  newContent: string;
  maxHeightClassName?: string;
  className?: string;
};

function diffLineClass(entry: DiffLine): string {
  if (entry.type === "add") {
    return "bg-[#dafbe1]/80 text-[#116329] dark:bg-[#033a16]/55 dark:text-[#7ee787]";
  }
  if (entry.type === "remove") {
    return "bg-[#ffebe9]/90 text-[#82071e] dark:bg-[#442222]/55 dark:text-[#ffaba8]";
  }
  return "text-foreground/70 dark:text-foreground/60";
}

function diffSignClass(entry: DiffLine): string {
  if (entry.type === "add") return "text-[#1a7f37] dark:text-[#3fb950]";
  if (entry.type === "remove") return "text-[#cf222e] dark:text-[#f85149]";
  return "text-muted-foreground/40";
}

function diffSign(entry: DiffLine): string {
  if (entry.type === "add") return "+";
  if (entry.type === "remove") return "−";
  return " ";
}

export function AgentChangeDiffView({
  filePath,
  previousContent,
  newContent,
  maxHeightClassName = "max-h-48",
  className,
}: AgentChangeDiffViewProps) {
  const diff = buildLineDiff(previousContent, newContent);

  if (diff.every((entry) => entry.type === "same")) {
    return (
      <p className="rounded-md border border-border/30 bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
        No line changes detected.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border/40 bg-[#f6f8fa] dark:bg-[#0d1117]",
        className,
      )}
    >
      <div className="border-b border-border/30 bg-muted/25 px-3 py-1.5 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
        <div>
          <span className="text-[#cf222e] dark:text-[#f85149]">--- </span>
          <span>a/{filePath}</span>
        </div>
        <div>
          <span className="text-[#1a7f37] dark:text-[#3fb950]">+++ </span>
          <span>b/{filePath}</span>
        </div>
      </div>

      <div
        className={cn(
          "overflow-auto font-mono text-[11px] leading-[1.55] [scrollbar-width:thin]",
          maxHeightClassName,
        )}
      >
        {diff.map((entry, index) => (
          <div
            key={`${entry.type}-${index}`}
            className={cn("flex min-w-0 items-start", diffLineClass(entry))}
          >
            <span
              className={cn(
                "w-5 shrink-0 select-none pl-2 text-center font-semibold",
                diffSignClass(entry),
              )}
            >
              {diffSign(entry)}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 whitespace-pre pr-3",
                entry.type === "remove" && "line-through decoration-[#cf222e]/40",
              )}
            >
              {entry.text.length > 0 ? entry.text : " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
