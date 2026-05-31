"use client";

import { MessageSquareOff, X } from "lucide-react";

type InvalidChatModalProps = {
  open: boolean;
  onClose: () => void;
};

export function InvalidChatModal({ open, onClose }: InvalidChatModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="alertdialog"
        aria-labelledby="invalid-chat-title"
        aria-describedby="invalid-chat-description"
        className="relative w-full max-w-[340px] overflow-hidden rounded-xl border border-border/50 bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/80 ring-1 ring-border/60">
            <MessageSquareOff className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="space-y-1.5">
            <h2 id="invalid-chat-title" className="text-base font-semibold text-foreground">
              Chat not found
            </h2>
            <p id="invalid-chat-description" className="text-xs leading-relaxed text-muted-foreground">
              This conversation doesn&apos;t exist, was deleted, or you don&apos;t have access to it.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
