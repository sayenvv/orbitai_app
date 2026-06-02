"use client";

import { useEffect, useRef } from "react";
import { Globe, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDoubleBackspace } from "@/hooks/use-double-backspace";

type WebpageUrlComposerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  size?: "md" | "lg";
  className?: string;
};

export function WebpageUrlComposerField({
  value,
  onChange,
  onSubmit,
  onCancel,
  error,
  loading = false,
  disabled = false,
  multiline = false,
  size = "md",
  className,
}: WebpageUrlComposerFieldProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { handleBackspace: handleDoubleBackspace, resetBackspace } = useDoubleBackspace(onCancel);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [loading, onCancel]);

  const sharedInputClass =
    "min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-sky-700/45 dark:placeholder:text-sky-300/45 sm:text-base";

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!loading && handleDoubleBackspace(!value.trim(), event)) return;
    if (event.key === "Enter") {
      if (multiline && event.shiftKey) return;
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-2xl border border-sky-500/35 bg-gradient-to-r from-sky-500/8 to-cyan-500/5 px-2 transition-all focus-within:border-sky-500/55 focus-within:ring-4 focus-within:ring-sky-500/12",
          size === "lg" ? "h-12 sm:h-14 sm:rounded-[22px] sm:px-2.5" : "min-h-[44px] py-1 pl-1.5 pr-2",
        )}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sky-500/10 hover:text-foreground disabled:opacity-50"
          aria-label="Cancel webpage mode"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <Globe className="h-4 w-4" />
        </span>

        <Link2 className="hidden h-4 w-4 shrink-0 text-sky-500/60 sm:block" />

        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            rows={1}
            disabled={disabled || loading}
            placeholder="Paste a documentation or article URL…"
            onChange={(event) => {
              onChange(event.target.value);
              resetBackspace();
            }}
            onKeyDown={handleKeyDown}
            className={cn(sharedInputClass, "resize-none py-2.5 leading-snug")}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="url"
            inputMode="url"
            autoComplete="url"
            value={value}
            disabled={disabled || loading}
            placeholder="Paste a documentation or article URL…"
            onChange={(event) => {
              onChange(event.target.value);
              resetBackspace();
            }}
            onKeyDown={handleKeyDown}
            className={sharedInputClass}
          />
        )}
      </div>
      {error ? <p className="mt-1.5 px-1 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
