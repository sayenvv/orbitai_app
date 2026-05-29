import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type FormAlertProps = {
  variant: "success" | "error" | "info";
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const styles = {
  success: {
    box: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  error: {
    box: "border-destructive/30 bg-destructive/5 text-destructive",
    icon: AlertCircle,
  },
  info: {
    box: "border-border bg-muted/40 text-muted-foreground",
    icon: Info,
  },
} as const;

export function FormAlert({ variant, title, children, className }: FormAlertProps) {
  const Icon = styles[variant].icon;
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm flex gap-2.5",
        styles[variant].box,
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium leading-snug">{title}</p>}
        <p className={cn("text-[13px] leading-relaxed", title && "mt-0.5 opacity-90")}>
          {children}
        </p>
      </div>
    </div>
  );
}
