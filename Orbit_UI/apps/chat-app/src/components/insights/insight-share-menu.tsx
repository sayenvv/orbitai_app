"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Link2,
  Share2,
} from "lucide-react";
import { buildInsightSharePayload } from "@/lib/share-insight";
import { publicApi } from "@/lib/orbit-api";
import { cn } from "@/lib/utils";

type CopiedAction = "link" | "text" | null;

type InsightShareMenuProps = {
  insightId: string;
  title: string;
  preview: string;
  sourceName?: string | null;
  variant?: "button" | "icon";
  className?: string;
  align?: "left" | "right";
};

export function InsightShareMenu({
  insightId,
  title,
  preview,
  sourceName,
  variant = "button",
  className,
  align = "right",
}: InsightShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<CopiedAction>(null);
  const [downloading, setDownloading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const payload = buildInsightSharePayload(title, preview, insightId, sourceName);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const flashCopied = useCallback((action: CopiedAction) => {
    setCopied(action);
    window.setTimeout(() => setCopied(null), 2000);
  }, []);

  const copyToClipboard = async (text: string, action: CopiedAction) => {
    await navigator.clipboard.writeText(text);
    flashCopied(action);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        setOpen(false);
        return;
      } catch {
        // User cancelled or unsupported — fall through
      }
    }
    await copyToClipboard(payload.url, "link");
    setOpen(false);
  };

  const handleCopyLink = async () => {
    await copyToClipboard(payload.url, "link");
    setOpen(false);
  };

  const handleCopyText = async () => {
    await copyToClipboard(payload.copyText, "text");
    setOpen(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await publicApi.downloadGenerated(insightId, title);
      setOpen(false);
    } finally {
      setDownloading(false);
    }
  };

  const menuItems = [
    {
      id: "share",
      label: "Share…",
      icon: Share2,
      onClick: () => void handleNativeShare(),
    },
    {
      id: "link",
      label: copied === "link" ? "Link copied" : "Copy link",
      icon: copied === "link" ? Check : Link2,
      active: copied === "link",
      onClick: () => void handleCopyLink(),
    },
    {
      id: "text",
      label: copied === "text" ? "Insights copied" : "Copy insights text",
      icon: copied === "text" ? Check : Copy,
      active: copied === "text",
      onClick: () => void handleCopyText(),
    },
    {
      id: "download",
      label: downloading ? "Downloading…" : "Download .txt",
      icon: Download,
      onClick: () => void handleDownload(),
      disabled: downloading,
    },
  ] as const;

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        aria-label="Share insight"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border border-border/45 bg-background/80 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
          open && "border-primary/25 bg-primary/8 text-primary",
          className,
        )}
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>
    ) : (
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-xl border border-border/45 bg-background/80 px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
          open && "border-primary/25 bg-primary/8 text-primary",
          className,
        )}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
    );

  return (
    <div ref={rootRef} className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
      {trigger}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1.5 min-w-[11.5rem] overflow-hidden rounded-xl border border-border/50 bg-card/95 p-1 shadow-lg backdrop-blur-md",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {menuItems.map(({ id, label, icon: Icon, onClick, active, disabled }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClick();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted/50",
                disabled && "opacity-50",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
