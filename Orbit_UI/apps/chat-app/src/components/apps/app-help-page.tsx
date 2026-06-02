"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  BriefcaseBusiness,
  Brush,
  Camera,
  CheckCircle2,
  Download,
  Film,
  ImagePlus,
  Mic2,
  Sparkles,
  Star,
  Users,
  Wand2,
} from "lucide-react";
import {
  getAppHelpContent,
  getAppLaunchHref,
  getAppWorkspaceHref,
  type CatalogApp,
} from "@orbit/clovai-apps";
import { useAppShell } from "@/components/layout/app-shell-context";
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </h2>
  );
}

function MetadataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium leading-snug text-foreground">{value}</p>
    </div>
  );
}

export function AppHelpPage({ app }: { app: CatalogApp }) {
  const { setHeader } = useAppShell();
  const help = getAppHelpContent(app);
  const backHref = getAppLaunchHref(app) ?? getAppWorkspaceHref(app);
  const Icon = iconMap[app.iconKey] ?? Sparkles;

  useEffect(() => {
    setHeader({
      title: app.name,
      subtitle: `Help · v${app.version}`,
    });
    return () => setHeader(null);
  }, [app.name, app.version, setHeader]);

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="aurora" aria-hidden />
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <div className="relative px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {app.name}
          </Link>

          <section
            className={cn(
              "relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 md:p-7",
              app.heroGradient,
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.14),transparent_48%)]" />
            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/30">
                  {app.category} · v{app.version}
                </span>
                <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/30">
                  {app.tier === "pro" ? "Pro" : "Starter"}
                </span>
              </div>

              <div className="max-w-2xl space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                  Documentation
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{help.title}</h1>
                <p className="text-sm leading-relaxed text-white/85 md:text-base">{help.subtitle}</p>
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
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="space-y-6">
              {help.workflowSteps && help.workflowSteps.length > 0 ? (
                <article className="rounded-2xl bg-card/75 p-5 backdrop-blur-sm md:p-6">
                  <SectionLabel>Recommended workflow</SectionLabel>
                  <ol className="relative mt-5 space-y-0">
                    {help.workflowSteps.map((step, index) => (
                      <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
                        {index < help.workflowSteps!.length - 1 ? (
                          <span
                            className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border/70"
                            aria-hidden
                          />
                        ) : null}
                        <span className="relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
                          {index + 1}
                        </span>
                        <p className="pt-1.5 text-sm leading-relaxed text-foreground">{step}</p>
                      </li>
                    ))}
                  </ol>
                </article>
              ) : null}

              <article className="rounded-2xl bg-card/75 p-5 backdrop-blur-sm md:p-6">
                <SectionLabel>Guide</SectionLabel>
                <ul className="mt-5 divide-y divide-border/40">
                  {help.sections.map((section) => (
                    <li key={section.title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-foreground">{section.title}</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-6">
              <article className="rounded-2xl bg-card/75 p-5 backdrop-blur-sm">
                <SectionLabel>App information</SectionLabel>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <MetadataField label="App" value={app.name} />
                  <MetadataField label="Version" value={app.version} />
                  <MetadataField label="Category" value={app.category} />
                  <MetadataField label="Tag" value={app.tag} />
                  <MetadataField label="Plan" value={app.tier === "pro" ? "Pro" : "Starter"} />
                  <MetadataField label="Model access" value={app.modelAccess} />
                  <MetadataField label="Rating" value={app.rating.toFixed(1)} />
                  <MetadataField label="Installs" value={app.installs} />
                  <MetadataField label="Monthly users" value={app.monthlyUsers} />
                  <MetadataField label="Usage" value={app.usageCount} />
                </dl>
              </article>

              {app.badges.length > 0 ? (
                <article className="rounded-2xl bg-card/75 p-5 backdrop-blur-sm">
                  <SectionLabel>Included features</SectionLabel>
                  <ul className="mt-4 grid gap-2">
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
              ) : null}

              <article className="rounded-2xl bg-card/75 p-5 backdrop-blur-sm">
                <SectionLabel>About</SectionLabel>
                <p className="mt-3 text-sm font-medium leading-snug text-foreground">{app.tagline}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{app.description}</p>
              </article>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
