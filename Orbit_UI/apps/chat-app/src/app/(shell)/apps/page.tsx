"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BriefcaseBusiness,
  Brush,
  Camera,
  ChevronLeft,
  ChevronRight,
  Film,
  ImagePlus,
  Mic2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wand2,
} from "lucide-react";
import { useAppShell } from "@/components/layout/app-shell-context";
import { useAuthStore } from "@/store/auth-store";
import {
  appCategories,
  visibleAppsCatalog,
  featuredApps,
  sponsoredApps,
  sortAppsByAvailability,
  getAppDetailHref,
  getAppLaunchBlockReason,
} from "@orbit/clovai-apps";
import { AppStoreCard } from "@/components/apps/app-store-card";
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

export default function AppsPage() {
  const { isAuthenticated } = useAuthStore();
  const { setHeader, openUpgrade, openLogin } = useAppShell();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideCount = featuredApps.length;
  const proApps = visibleAppsCatalog.filter((app) => app.tier === "pro").length;
  const totalInstalls = "346k+ installs";

  const goTo = useCallback(
    (next: number) => {
      setSlide((next + slideCount) % slideCount);
    },
    [slideCount],
  );

  useEffect(() => {
    if (slideCount <= 1) return;
    timerRef.current = setInterval(() => {
      setSlide((prev) => (prev + 1) % slideCount);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slideCount]);

  const filteredApps = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = visibleAppsCatalog.filter((app) => {
      const matchesCategory = category === "All" || app.category === category;
      const matchesTerm =
        !term ||
        app.name.toLowerCase().includes(term) ||
        app.category.toLowerCase().includes(term) ||
        app.shortDescription.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
    return sortAppsByAvailability(matches, isAuthenticated);
  }, [query, category, isAuthenticated]);

  useEffect(() => {
    setHeader({
      title: "Apps",
      subtitle: "Discover premium AI apps",
    });
    return () => setHeader(null);
  }, [setHeader]);

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="aurora" aria-hidden />
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative px-4 py-6 md:px-8 md:py-12">
        <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-10">
          <header className="space-y-3 md:space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:gap-2 sm:px-3 sm:text-xs">
                  <BadgeCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Clovai App Store
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-gradient sm:text-3xl md:text-5xl">
                  Premium AI apps for every creative workflow
                </h1>
                <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm md:text-base">
                  Explore curated apps for design, image generation, editing, video, voice, and
                  brand production. Subscribe once and launch the tools your team needs.
                </p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apps..."
                  className="w-full rounded-full border border-border/60 bg-card/80 py-2.5 pl-10 pr-4 text-sm shadow-mac outline-none backdrop-blur-sm transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20 sm:py-3"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 sm:max-w-xl sm:gap-3 sm:pt-2">
              <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 backdrop-blur-sm sm:rounded-2xl sm:p-3">
                <p className="text-base font-semibold tracking-tight sm:text-lg">{visibleAppsCatalog.length}</p>
                <p className="text-[11px] text-muted-foreground">AI apps</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 backdrop-blur-sm sm:rounded-2xl sm:p-3">
                <p className="text-base font-semibold tracking-tight sm:text-lg">{proApps}</p>
                <p className="text-[11px] text-muted-foreground">Pro tools</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 backdrop-blur-sm sm:rounded-2xl sm:p-3">
                <p className="text-base font-semibold tracking-tight sm:text-lg">{totalInstalls}</p>
                <p className="text-[11px] text-muted-foreground">Trusted launches</p>
              </div>
            </div>
          </header>

          {/* Hero slider */}
          <section className="relative">
            <div className="relative overflow-hidden rounded-3xl">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${slide * 100}%)` }}
              >
                {featuredApps.map((app) => {
                  const Icon = iconMap[app.iconKey] ?? Sparkles;
                  const primaryShot = app.screenshots[0];
                  const secondaryShots = app.screenshots.slice(1, 3);
                  return (
                    <Link
                      key={app.slug}
                      href={getAppDetailHref(app)}
                      className="group relative w-full shrink-0"
                    >
                      <div
                        className={cn(
                          "relative grid min-h-[260px] overflow-hidden bg-gradient-to-br p-5 sm:min-h-[320px] md:min-h-[420px] md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:p-10",
                          app.heroGradient,
                        )}
                      >
                        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
                        <div className="pointer-events-none absolute bottom-0 right-1/3 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-cyan-300/18 blur-3xl" />
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.30),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_44%)]" />

                        <div className="relative flex flex-col justify-between gap-8 md:gap-10">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm sm:h-12 sm:w-12 sm:rounded-2xl">
                              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </span>
                            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/30 sm:px-3 sm:text-[11px]">
                              Featured · {app.tag}
                            </span>
                          </div>

                          <div className="max-w-2xl space-y-4 md:space-y-5">
                            <div className="space-y-2 sm:space-y-3">
                              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-5xl">
                                {app.name}
                              </h2>
                              <p className="text-sm leading-relaxed text-white/90 sm:text-base md:text-xl">
                                {app.tagline}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 sm:gap-3 sm:text-sm">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25 sm:px-3 sm:py-1.5">
                                <Star className="h-3.5 w-3.5 fill-white text-white sm:h-4 sm:w-4" />
                                {app.rating.toFixed(1)}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25 sm:px-3 sm:py-1.5">
                                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                {app.monthlyUsers}
                              </span>
                              <span className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25 sm:inline-flex">
                                <ShieldCheck className="h-4 w-4" />
                                {app.modelAccess}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg transition-transform group-hover:translate-x-1 sm:px-5 sm:py-2.5 sm:text-sm">
                              View app details
                              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </span>
                          </div>
                        </div>

                        <div className="relative mt-8 hidden items-center md:flex">
                          <div className="w-full rounded-[2rem] border border-white/25 bg-white/18 p-3 shadow-2xl shadow-black/20 backdrop-blur-md">
                            <div className="overflow-hidden rounded-[1.5rem] bg-white/95 text-slate-950 shadow-2xl">
                              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                </div>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  Live preview
                                </span>
                              </div>
                              <div className="space-y-4 p-5">
                                <div
                                  className={cn(
                                    "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white",
                                    primaryShot?.gradientClass ?? app.heroGradient,
                                  )}
                                >
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.55),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_44%)]" />
                                  <div className="relative flex items-center justify-between">
                                    <Icon className="h-7 w-7 drop-shadow-sm" />
                                    <Sparkles className="h-5 w-5 opacity-90" />
                                  </div>
                                  <div className="relative mt-10 max-w-[70%]">
                                    <p className="text-xl font-bold">{primaryShot?.title ?? app.name}</p>
                                    <p className="mt-1 text-sm text-white/85">
                                      {primaryShot?.caption ?? `${app.category} workflow`}
                                    </p>
                                  </div>
                                  <div className="absolute bottom-5 right-5 grid grid-cols-2 gap-1.5">
                                    {secondaryShots.map((shot) => (
                                      <span
                                        key={shot.title}
                                        className={cn(
                                          "h-10 w-14 rounded-xl bg-gradient-to-br ring-1 ring-white/25",
                                          shot.gradientClass,
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {app.badges.map((badge) => (
                                    <span
                                      key={badge}
                                      className="rounded-xl bg-slate-100 px-2 py-2 text-center text-[10px] font-medium text-slate-600"
                                    >
                                      {badge}
                                    </span>
                                  ))}
                                </div>
                                <div className="rounded-2xl border border-slate-200 p-3">
                                  <div className="h-2 w-24 rounded-full bg-slate-200" />
                                  <div className="mt-3 space-y-2">
                                    <div className="h-2 rounded-full bg-slate-100" />
                                    <div className="h-2 w-4/5 rounded-full bg-slate-100" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {slideCount > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => goTo(slide - 1)}
                    className="absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/20 p-2 text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/30 sm:inline-flex"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => goTo(slide + 1)}
                    className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/20 p-2 text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/30 sm:inline-flex"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {slideCount > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {featuredApps.map((app, index) => (
                  <button
                    key={app.slug}
                    type="button"
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => goTo(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === slide
                        ? "w-7 bg-primary"
                        : "w-1.5 bg-border hover:bg-muted-foreground/50",
                    )}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Category pills */}
          <section className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {appCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition",
                  category === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card/70 text-muted-foreground backdrop-blur-sm hover:border-primary/40 hover:text-foreground",
                )}
              >
                {cat}
              </button>
            ))}
          </section>

          {/* App grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">
                {category === "All" ? "All apps" : category}
              </h2>
              <button
                type="button"
                onClick={openUpgrade}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Upgrade for pro apps
              </button>
            </div>

            <div className="grid grid-cols-2 items-stretch gap-3.5 sm:gap-5 xl:grid-cols-3">
              {filteredApps.map((app) => {
                const blockReason = getAppLaunchBlockReason(app, isAuthenticated);
                return (
                  <AppStoreCard
                    key={app.slug}
                    app={app}
                    locked={Boolean(blockReason)}
                    lockReason={blockReason ?? undefined}
                    onUpgrade={openUpgrade}
                    onSignIn={() => openLogin("login")}
                  />
                );
              })}
            </div>

            {filteredApps.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 py-14 text-center">
                <Search className="mx-auto h-6 w-6 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No apps match your search. Try a different keyword.
                </p>
              </div>
            )}
          </section>

          {/* Sponsored */}
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Sponsored & partner apps</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Curated partner tools that work well beside Clovai workflows.
                </p>
              </div>
              <span className="hidden rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
                Promoted
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {sponsoredApps.map((ad) => (
                <article
                  key={ad.name}
                  className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/75 p-6 shadow-mac backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${ad.gradientClass}`}
                    aria-hidden
                  />
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
                  <div className="relative space-y-3">
                    <span className="inline-flex rounded-full border border-border/50 bg-background/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {ad.label}
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight">{ad.name}</h3>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{ad.pitch}</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-sm font-semibold text-primary shadow-sm transition group-hover:translate-x-0.5"
                    >
                      {ad.cta}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Pro CTA */}
          <section className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 md:p-8">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div className="space-y-1.5">
                <p className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Clovai Pro
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Unlock advanced models, faster generations, and every premium creative app in one
                  subscription.
                </p>
              </div>
              <button
                type="button"
                onClick={openUpgrade}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                See plans
              </button>
            </div>
          </section>

          {!isAuthenticated && (
            <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card/70 p-5 text-center shadow-mac backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">
                Sign in to use free apps, save your work, and sync generated outputs across devices.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
