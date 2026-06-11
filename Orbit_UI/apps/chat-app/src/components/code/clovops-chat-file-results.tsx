"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileCode2 } from "lucide-react";
import type { ApiCodeWorkspaceSearchMatch } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type ClovopsChatFileResultsProps = {
  files: ApiCodeWorkspaceSearchMatch[];
  onOpenFile?: (fileId: string, line: number) => void;
  className?: string;
};

export function ClovopsChatFileResults({
  files,
  onOpenFile,
  className,
}: ClovopsChatFileResultsProps) {
  const [open, setOpen] = useState(true);

  if (!files.length) return null;

  return (
    <section className={cn("mt-1 w-full", className)} aria-label="Relevant project files">
      <div className="overflow-hidden rounded-lg border border-border/35 bg-muted/10">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/20"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          )}
          <span className="text-[12px] text-muted-foreground">
            {files.length} relevant file{files.length === 1 ? "" : "s"}
          </span>
        </button>

        {open ? (
          <ul className="border-t border-border/25 px-1 py-1">
            {files.map((file, index) => (
              <li key={`${file.fileId}-${file.line}`} className={cn(index > 0 && "border-t border-border/20")}>
                <button
                  type="button"
                  onClick={() => onOpenFile?.(file.fileId, file.line)}
                  className="group flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/25"
                >
                  <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px] leading-snug text-foreground/85">
                      {file.filePath}:{file.line}
                    </span>
                    {file.lineText.trim() ? (
                      <span className="mt-0.5 block truncate text-[11px] leading-snug text-muted-foreground/75">
                        {file.lineText.trim()}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
