"use client";

import { FileCode2 } from "lucide-react";
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
  if (!files.length) return null;

  return (
    <section className={cn("w-full pl-11 sm:pl-12", className)} aria-label="Relevant project files">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
        Relevant files
      </p>
      <ul className="flex flex-col gap-1.5">
        {files.map((file) => (
          <li key={`${file.fileId}-${file.line}`}>
            <button
              type="button"
              onClick={() => onOpenFile?.(file.fileId, file.line)}
              className="group flex w-full items-start gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border/60 hover:bg-muted/40"
            >
              <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-snug text-foreground">
                  {file.filePath}:{file.line}
                </span>
                <span className="mt-0.5 block truncate text-[12px] leading-snug text-muted-foreground transition-colors group-hover:text-foreground/80">
                  {file.lineText.trim() || file.kind}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
