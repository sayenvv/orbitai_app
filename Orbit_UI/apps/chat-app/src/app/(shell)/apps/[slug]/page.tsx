"use client";

import Link from "next/link";
import { useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  Camera,
  CheckCircle2,
  Download,
  Film,
  ImagePlus,
  Mic2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wand2,
} from "lucide-react";
import { AppStoreCard } from "@/components/apps/app-store-card";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import { appsCatalog, findCatalogApp } from "@/lib/apps-catalog";
import { cn } from "@/lib/utils";

const iconMap = {
  wand: Wand2,
  camera: Camera,
  brush: Brush,
  film: Film,
  mic: Mic2,
  image: ImagePlus,
  sparkles: Sparkles,
} as const;

export default function AppDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { setHeader, openUpgrade } = useAppShell();
  const { isAuthenticated } = useAuthStore();

  const app = useMemo(() => findCatalogApp(params.slug), [params.slug]);
  const related = useMemo(
    () => appsCatalog.filter((candidate) => candidate.slug !== params.slug).slice(0, 3),
    [params.slug],
  );

  useEffect(() => {
    if (!app) {
      setHeader({
        title: "App",
        subtitle: "Not found",
      });
      return () => setHeader(null);
    }
    setHeader({
      title: app.name,
      subtitle: `${app.category} · ${app.modelAccess}`,
    });
    return () => setHeader(null);
  }, [app, setHeader]);

  if (!app) {
    return (
      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-16 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-card/70 p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">App not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app you are looking for is not available. Browse the app store to continue.
          </p>
          <Link
            href="/apps"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app store
          </Link>
        </div>
      </div>
    );
  }

  const Icon = iconMap[app.iconKey] ?? Sparkles;

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="aurora" aria-hidden />
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <div className="relative px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <button
            type="button"
            onClick={() => router.push("/apps")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app store
          </button>

          <section className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 md:p-7", app.heroGradient)}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_42%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div className="space-y-4 text-white">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-white/30">
                    {app.tag} · {app.tier === "pro" ? "Pro app" : "Starter app"}
                  </span>
                </div>
                <div className="max-w-2xl space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{app.name}</h1>
                  <p className="text-base leading-relaxed text-white/90 md:text-xl">{app.tagline}</p>
                  <p className="text-sm leading-relaxed text-white/80">
                    {app.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-white/90">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 ring-1 ring-white/25">
                    <Star className="h-3.5 w-3.5 fill-white text-white" />
                    {app.rating.toFixed(1)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 ring-1 ring-white/25">
                    <Users className="h-3.5 w-3.5" />
                    {app.monthlyUsers}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 ring-1 ring-white/25">
                    <Download className="h-3.5 w-3.5" />
                    {app.installs}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openUpgrade}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:translate-x-0.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Unlock with subscription
                </button>
              </div>

              <div className="rounded-3xl bg-white/18 p-2.5 backdrop-blur-md">
                <div className="overflow-hidden rounded-2xl bg-white/95 text-slate-950">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {app.category}
                    </span>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className={cn("aspect-video rounded-xl bg-gradient-to-br p-4 text-white", app.heroGradient)}>
                      <div className="flex items-center justify-between">
                        <Icon className="h-6 w-6" />
                        <ShieldCheck className="h-4 w-4 opacity-80" />
                      </div>
                      <p className="mt-12 text-xl font-bold">{app.name}</p>
                      <p className="mt-0.5 text-xs text-white/80">{app.usageCount}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {app.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-lg bg-slate-100 px-2 py-1.5 text-center text-[10px] font-medium text-slate-600"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Screenshots</h2>
              <span className="text-xs text-muted-foreground">Swipe to explore</span>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {app.screenshots.map((shot) => (
                <article
                  key={shot.title}
                  className="w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl bg-card/75 backdrop-blur-sm sm:w-[58%] lg:w-[44%]"
                >
                  <div className={`relative aspect-video bg-gradient-to-br ${shot.gradientClass}`}>
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
                    <div className="absolute inset-3 rounded-xl bg-black/10 backdrop-blur-[1px]" />
                    <div className="absolute left-6 top-6 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-white/50" />
                      <span className="h-2 w-2 rounded-full bg-white/35" />
                      <span className="h-2 w-2 rounded-full bg-white/25" />
                    </div>
                    <div className="absolute inset-x-6 top-12 rounded-md bg-white/20 px-3 py-1.5 text-[11px] font-semibold text-white/95">
                      {shot.title}
                    </div>
                    <div className="absolute inset-x-6 bottom-6 rounded-md bg-white/15 px-3 py-2 text-[11px] text-white/95">
                      {shot.caption}
                    </div>
                  </div>
                  <div className="space-y-1 p-3.5">
                    <p className="text-sm font-medium">{shot.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{shot.caption}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-2xl bg-card/75 p-5 backdrop-blur-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Included features
              </h3>
              <ul className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {app.badges.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 rounded-xl bg-background/60 px-3 py-2.5 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl bg-card/75 p-5 backdrop-blur-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Model access
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This app runs on <span className="font-semibold text-foreground">{app.modelAccess}</span>.
                Upgrade your plan to access larger models, faster generations, and higher usage
                limits.
              </p>
              <button
                type="button"
                onClick={openUpgrade}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                See subscription options
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Related apps</h2>
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((candidate) => {
                const locked = candidate.tier === "pro" && !isAuthenticated;
                return <AppStoreCard key={candidate.slug} app={candidate} locked={locked} />;
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
