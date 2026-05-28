"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, X } from "lucide-react";
import { LoginModal } from "./login-modal";

const POPUP_INTERVAL = 60 * 1000; // 1 minute

export function LoginPopup() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const timer = setInterval(() => {
      setShowPrompt(true);
    }, POPUP_INTERVAL);
    return () => clearInterval(timer);
  }, [dismissed]);

  if (showLoginModal) {
    return <LoginModal open={true} onClose={() => setShowLoginModal(false)} />;
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-[320px] rounded-xl bg-background border border-border/50 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 overflow-hidden">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-10"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="px-6 pt-6 pb-6 flex flex-col items-center text-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-foreground">
              Get more from StudyAI
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sign in to save conversations, access study materials, and get personalized learning.
            </p>
          </div>

          <div className="flex flex-col w-full gap-2 pt-1">
            <button
              onClick={() => {
                setShowPrompt(false);
                setShowLoginModal(true);
              }}
              className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={handleDismiss}
              className="w-full h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
