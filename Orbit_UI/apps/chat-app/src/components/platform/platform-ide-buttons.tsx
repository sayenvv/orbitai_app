import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Visual Studio Code mark (official-style asset). */
export function VsCodeLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static brand icon from /public
    <img
      src="/icons/vscode.png"
      alt=""
      aria-hidden
      className={cn("size-5 shrink-0 object-contain", className)}
    />
  );
}

type EditorOptionCardProps = {
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: ReactNode;
  iconClassName?: string;
};

export function EditorOptionCard({
  title,
  subtitle,
  onClick,
  disabled,
  loading,
  icon,
  iconClassName,
}: EditorOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "glass-surface glass-card-interactive group flex w-full items-center gap-3 rounded-2xl p-4 text-left transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/50 transition",
          "bg-foreground/[0.04] group-hover:bg-foreground/[0.06]",
          iconClassName,
        )}
      >
        {loading ? (
          <span className="inline-flex size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
        ) : (
          icon
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function VsCodeEditorCard({
  onClick,
  disabled,
  loading,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <EditorOptionCard
      title="Visual Studio Code"
      subtitle="Open the project folder locally"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      icon={<VsCodeLogo />}
      iconClassName="bg-[#007ACC]/10 ring-[#007ACC]/20 group-hover:bg-[#007ACC]/15"
    />
  );
}

export function OrbitIdeEditorCard({
  onClick,
  disabled,
  loading,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: ReactNode;
}) {
  return (
    <EditorOptionCard
      title="Orbit IDE"
      subtitle="Edit in the built-in workspace"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      icon={icon}
    />
  );
}
