"use client";

import { useTheme } from "next-themes";

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
