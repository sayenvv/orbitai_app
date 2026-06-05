"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { X, Loader2, Eye, EyeOff, Bot, ArrowLeft } from "lucide-react";
import { authApi, mapApiUser } from "@/lib/orbit-api";
import { loginSchema, registerSchema } from "@/lib/auth-schemas";
import { useAuthStore } from "@/store/auth-store";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
}

export function LoginModal({ open, onClose, defaultMode = "login" }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [open, defaultMode]);

  if (!open) return null;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setConfirmPassword("");
    setError(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        const parsed = registerSchema.safeParse({
          email,
          password,
          name,
          confirmPassword,
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid form data");
          return;
        }
        await authApi.register(parsed.data.name, parsed.data.email, parsed.data.password);
      } else {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid form data");
          return;
        }
        await authApi.login(parsed.data.email, parsed.data.password);
      }
      const me = await authApi.me();
      useAuthStore.getState().setUser(mapApiUser(me));
      resetForm();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-[340px] rounded-xl bg-background border border-border/50 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-10"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="pt-6 pb-1 px-6 text-center">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 mb-3">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <h2 id="login-modal-title" className="text-base font-semibold text-foreground">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "login"
              ? "Sign in to save conversations & access materials"
              : "Start your personalized study experience"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pt-3 pb-6 space-y-3">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-1">
              <label htmlFor="login-name" className="text-xs font-medium text-foreground/80">
                Full name
              </label>
              <input
                id="login-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                autoComplete="name"
                className="flex h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="login-email" className="text-xs font-medium text-foreground/80">
              Email
            </label>
            <input
              ref={mode === "login" ? emailRef : undefined}
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="flex h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="login-password" className="text-xs font-medium text-foreground/80">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="flex h-9 w-full rounded-lg border border-border bg-muted/30 px-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="space-y-1">
              <label htmlFor="login-confirm-password" className="text-xs font-medium text-foreground/80">
                Confirm password
              </label>
              <input
                id="login-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                className="flex h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              mode === "login" ? "Continue" : "Create account"
            )}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={switchMode}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <span className="font-medium text-primary">Sign up</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="h-3 w-3" />
                  Back to{" "}
                  <span className="font-medium text-primary">Sign in</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
