"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@orbit/ui";
import { authApi, isAdminRole, ApiError } from "@/lib/orbit-api";
import { useSessionStore } from "@/store/session-store";
import { cn } from "@/lib/utils";

type LoginFieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

function validateLogin(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
}

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser, setLoading, markAuthGrace, isLoading } = useSessionStore();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    markAuthGrace(60_000);
    try {
      const data = await authApi.login(email.trim(), password);
      if (!isAdminRole(data.user.role)) {
        setFieldErrors({
          form: "Admin access required. Use admin@orbit.ai.",
        });
        return;
      }
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      });
      setLoading(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign in failed";
      setFieldErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  function showError(key: keyof LoginFieldErrors) {
    if (!submitted) return undefined;
    return fieldErrors[key];
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card shadow-lg p-6">
        <div className="text-center mb-5">
          <BrandMark size="lg" layout="stacked" className="mx-auto mb-3" />
          <h2 className="text-base font-semibold">Admin</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading ? "Checking session…" : "Sign in with an admin account"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {fieldErrors.form && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {fieldErrors.form}
            </p>
          )}
          <div className="space-y-1">
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@orbit.ai"
              autoComplete="email"
              aria-invalid={Boolean(showError("email"))}
              className={cn(
                "form-input w-full",
                showError("email") && "border-destructive focus-visible:ring-destructive/30",
              )}
            />
            {showError("email") && (
              <p className="text-[10px] text-destructive">{showError("email")}</p>
            )}
          </div>
          <div className="space-y-1">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              aria-invalid={Boolean(showError("password"))}
              className={cn(
                "form-input w-full",
                showError("password") && "border-destructive focus-visible:ring-destructive/30",
              )}
            />
            {showError("password") && (
              <p className="text-[10px] text-destructive">{showError("password")}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Sign in"}
          </button>
          <p className="text-[10px] text-center text-muted-foreground">
            Demo: admin@orbit.ai / admin1234
          </p>
        </form>
      </div>
    </div>
  );
}
