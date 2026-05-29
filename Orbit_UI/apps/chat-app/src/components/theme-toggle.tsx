"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function ThemeSelect({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={`h-9 w-[7.5rem] rounded-lg border border-border/70 bg-background/90 ${className}`} />;
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={theme ?? "system"}
        onChange={(e) => setTheme(e.target.value)}
        className="w-full min-w-[7.5rem] appearance-none rounded-lg border border-border/70 bg-background/90 py-2 pl-3 pr-8 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Theme"
      >
        {THEME_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
      return;
    }

    if (theme === "light") {
      setTheme("system");
      return;
    }

    setTheme("dark");
  };

  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="inline-flex items-center rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
      aria-label="Cycle theme mode"
    >
      {label}
    </button>
  );
}
