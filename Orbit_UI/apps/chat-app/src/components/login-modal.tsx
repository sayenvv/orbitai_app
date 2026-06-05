"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { X, Loader2, Eye, EyeOff, Bot, ArrowLeft } from "lucide-react";
import { BrandMark, BRAND_NAME } from "@orbit/ui";
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

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

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

  const inputClassName =
    "glass-input flex h-11 w-full rounded-xl px-4 text-sm text-foreground transition-all placeholder:text-muted-foreground focus-visible:outline-none";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-page-title"
      className="auth-page fixed inset-0 z-[150] flex h-dvh w-full flex-col"
    >
      <header className="auth-page-header flex shrink-0 items-center justify-between px-4 py-3 safe-x safe-top md:px-6">
        <BrandMark size="sm" layout="inline" />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close and return to app"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8 safe-x safe-bottom md:px-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 text-center">
            <div className="glass-surface mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl">
              <Bot className="h-6 w-6 text-foreground" />
            </div>
            <h1 id="auth-page-title" className="text-2xl font-semibold tracking-tight text-foreground">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {mode === "login"
                ? `Sign in to ${BRAND_NAME} to save conversations and access your library.`
                : "Start your personalized study experience with a free account."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-1.5">
                <label htmlFor="login-name" className="text-sm font-medium text-foreground">
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
                  className={inputClassName}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">
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
                className={inputClassName}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
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
                  className={`${inputClassName} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-1.5">
                <label htmlFor="login-confirm-password" className="text-sm font-medium text-foreground">
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
                  className={inputClassName}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-nav-sign-up mt-2 h-11 w-full rounded-full text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={switchMode}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {mode === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <span className="font-medium text-foreground">Sign up</span>
                  </>
                ) : (
                  <>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Already have an account?{" "}
                    <span className="font-medium text-foreground">Sign in</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
