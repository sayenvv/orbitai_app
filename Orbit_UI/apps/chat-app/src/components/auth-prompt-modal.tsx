"use client";

import { X } from "lucide-react";
import { BrandMark, BRAND_NAME } from "@orbit/ui";

type AuthPromptModalProps = {
  open: boolean;
  onClose: () => void;
  onSignIn: () => void;
};

export function AuthPromptModal({ open, onClose, onSignIn }: AuthPromptModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[320px] overflow-hidden rounded-xl border border-border/50 bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-6 text-center">
          <BrandMark size="lg" layout="stacked" />

          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-foreground">
              Get more from {BRAND_NAME}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sign in to save conversations, access study materials, and get personalized learning.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onSignIn}
              className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-full rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
