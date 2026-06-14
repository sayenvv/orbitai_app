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
        "group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-background p-3 text-left transition",
        "hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 transition",
          "group-hover:bg-muted/50",
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
        <span className="block text-[13px] font-medium text-foreground">{title}</span>
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
