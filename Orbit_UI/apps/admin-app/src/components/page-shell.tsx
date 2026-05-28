import { cn } from "@/lib/utils";
import { ProfileMenu } from "@/components/profile-menu";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("relative z-40 flex items-center justify-between gap-4 border-b bg-background/40 backdrop-blur px-6 h-16", className)}>
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-base font-semibold tracking-tight leading-none truncate">{title}</h1>
        {description && (
          <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-none truncate">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <span className="hidden md:block h-6 w-px bg-border/60 mx-1" />
        <ProfileMenu />
      </div>
    </header>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 overflow-y-auto p-6", className)}>{children}</div>;
}

export function EmptyHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>
    </div>
  );
}
