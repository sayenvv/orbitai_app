"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Link2, Mail, Share2 } from "lucide-react";

import { studioButtonSecondary } from "@/components/studio/studio-ui";
import {
  copyPlanShareLink,
  openPlanShareEmail,
  openPlanShareWhatsApp,
  type PlanShareContext,
} from "@/lib/plan-share";
import { cn } from "@/lib/utils";

type PlanShareMenuProps = {
  context: PlanShareContext;
  className?: string;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function PlanShareMenu({ context, className }: PlanShareMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailPrepared, setEmailPrepared] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleCopyLink = useCallback(async () => {
    const copied = await copyPlanShareLink(context);
    if (copied) {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    }
    setOpen(false);
  }, [context]);

  const handleWhatsApp = useCallback(() => {
    openPlanShareWhatsApp(context);
    setOpen(false);
  }, [context]);

  const handleEmail = useCallback(async () => {
    await openPlanShareEmail(context);
    setEmailPrepared(true);
    window.setTimeout(() => setEmailPrepared(false), 3000);
    setOpen(false);
  }, [context]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          studioButtonSecondary("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"),
          open && "bg-muted/60",
        )}
      >
        <Share2 className="size-3.5" />
        Share
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 min-w-[11.5rem] overflow-hidden rounded-md border border-border/70 bg-background p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleCopyLink()}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
          >
            {linkCopied ? <Check className="size-3.5 text-primary" /> : <Link2 className="size-3.5" />}
            {linkCopied ? "Link copied" : "Copy link"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleWhatsApp}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
          >
            <WhatsAppIcon className="size-3.5 text-[#25D366]" />
            Share on WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleEmail()}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
          >
            <Mail className="size-3.5" />
            {emailPrepared ? "Colorful template copied" : "Share via email"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
