"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  Brush,
  Camera,
  Download,
  Film,
  ImagePlus,
  Mic2,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import {
  getAppLaunchHref,
  getAppDetailHref,
  type CatalogApp,
} from "@orbit/clovai-apps";
import { cn } from "@/lib/utils";

const iconMap = {
  wand: Wand2,
  camera: Camera,
  brush: Brush,
  film: Film,
  mic: Mic2,
  image: ImagePlus,
  sparkles: Sparkles,
  briefcase: BriefcaseBusiness,
  book: BookOpenCheck,
} as const;

type AppStoreCardProps = {
  app: CatalogApp;
  locked?: boolean;
  onUpgrade?: () => void;
};

export function AppStoreCard({ app, locked = false, onUpgrade }: AppStoreCardProps) {
  const router = useRouter();
  const Icon = iconMap[app.iconKey] ?? Sparkles;
  const primaryShot = app.screenshots[0];
  const secondaryShots = app.screenshots.slice(1, 3);
  const launchHref = getAppLaunchHref(app);
  const canLaunch = Boolean(launchHref) && !locked;
  const actionLabel = locked ? "Pro" : canLaunch ? "Use" : "Soon";

  const handleUseClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (locked) {
      onUpgrade?.();
      return;
    }

    if (launchHref) {
      router.push(launchHref);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-mac backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg sm:min-h-[340px] sm:rounded-3xl">
      <Link
        href={getAppDetailHref(app)}
        className="block min-h-0 flex-1"
        aria-label={`View ${app.name} details`}
      >
        <div
          className={cn(
            "relative h-[104px] overflow-hidden bg-gradient-to-br sm:hidden",
            app.heroGradient,
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.34),transparent_36%)]" />
          <div className="absolute left-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/25 backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </div>
          <div className="absolute right-2.5 top-2.5 rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm">
            {app.tier === "pro" ? "Pro" : "Starter"}
          </div>
          <div className="absolute inset-x-2.5 bottom-2.5 overflow-hidden rounded-xl bg-white/18 p-1.5 backdrop-blur-sm">
            <div
              className={cn(
                "relative h-8 overflow-hidden rounded-lg bg-gradient-to-br",
                primaryShot?.gradientClass ?? app.heroGradient,
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.66),transparent_34%)]" />
              <div className="absolute bottom-1.5 left-1.5 h-1.5 w-9 rounded-full bg-white/75" />
              <div className="absolute bottom-1.5 right-1.5 h-1.5 w-4 rounded-full bg-white/45" />
            </div>
          </div>
        </div>

        <div
          className={cn(
            "relative hidden aspect-[16/10] overflow-hidden bg-gradient-to-br p-3 sm:block",
            app.heroGradient,
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.34),transparent_32%)]" />
          <div className="absolute left-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/25 backdrop-blur-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div className="absolute right-3 top-3 z-10 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm">
            {app.tier === "pro" ? "Pro" : "Starter"}
          </div>

          <div className="absolute inset-x-3 bottom-3 top-14 overflow-hidden rounded-2xl bg-white/92 p-3 text-slate-950 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="grid h-[calc(100%-0.875rem)] grid-cols-[0.75fr_1fr] gap-2">
              <div
                className={cn(
                  "relative min-h-0 overflow-hidden rounded-lg bg-gradient-to-br",
                  primaryShot?.gradientClass ?? app.heroGradient,
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.65),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.18),transparent_42%)]" />
                <div className="absolute inset-x-2 bottom-2 rounded-md bg-white/24 p-1.5 backdrop-blur-sm">
                  <div className="h-1.5 w-2/3 rounded-full bg-white/75" />
                  <div className="mt-1 h-1.5 w-1/2 rounded-full bg-white/45" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-3/4 rounded-full bg-slate-200" />
                <div className="h-2 w-full rounded-full bg-slate-100" />
                <div className="h-2 w-2/3 rounded-full bg-slate-100" />
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {secondaryShots.map((shot) => (
                    <div
                      key={shot.title}
                      className={cn(
                        "relative h-8 overflow-hidden rounded-md bg-gradient-to-br",
                        shot.gradientClass,
                      )}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.55),transparent_38%)]" />
                      <div className="absolute bottom-1.5 left-1.5 h-1 w-7 rounded-full bg-white/65" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-2.5 sm:p-5 sm:pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-semibold tracking-tight sm:text-base">
                {app.name}
              </h3>
              <p className="truncate text-[10px] font-medium text-primary sm:text-xs">
                {app.category}
              </p>
            </div>
          </div>

          <p className="mt-1 line-clamp-2 min-h-[1.9rem] text-[10px] leading-snug text-muted-foreground sm:mt-2 sm:min-h-[2.5rem] sm:text-sm sm:leading-relaxed">
            {app.shortDescription}
          </p>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between border-t border-border/50 px-2.5 py-2 text-[10px] text-muted-foreground sm:px-5 sm:pb-5 sm:pt-3 sm:text-[12px]">
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3 w-3 text-amber-500 sm:h-3.5 sm:w-3.5" />
          {app.rating.toFixed(1)}
        </span>
        <span className="hidden items-center gap-1.5 min-[390px]:inline-flex">
          <Download className="h-3 w-3 text-primary sm:h-3.5 sm:w-3.5" />
          {app.installs}
        </span>
        <button
          type="button"
          onClick={handleUseClick}
          disabled={!locked && !canLaunch}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors sm:px-3 sm:text-[11px]",
            locked
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : canLaunch
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          {actionLabel}
          {!locked && canLaunch && (
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 sm:h-3.5 sm:w-3.5" />
          )}
        </button>
      </div>
    </article>
  );
}
