"use client";

type AuthNavTabsProps = {
  onSignIn: () => void;
  onSignUp: () => void;
  className?: string;
};

export function AuthNavTabs({ onSignIn, onSignUp, className }: AuthNavTabsProps) {
  return (
    <div
      className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}
      role="group"
      aria-label="Sign in or sign up"
    >
      <button
        type="button"
        onClick={onSignIn}
        className="auth-nav-sign-in inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-medium transition-all"
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={onSignUp}
        className="auth-nav-sign-up inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-medium transition-all"
      >
        Sign Up
      </button>
    </div>
  );
}
