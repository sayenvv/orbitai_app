import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between gap-4 border-b px-6 h-14", className)}>
      <div className="flex flex-col justify-center">
        <h1 className="text-sm font-semibold tracking-tight leading-none">{title}</h1>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-1 leading-none">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 overflow-y-auto p-6", className)}>{children}</div>;
}

export function EmptyHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>
    </div>
  );
}
