import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Globe,
  LayoutGrid,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { featuredApps, visibleAppsCatalog, getAppDetailHref } from "@orbit/clovai-apps";
import { BRAND_NAME } from "@orbit/ui";
import { chatConfig } from "@/lib/config";
import { routes } from "@/lib/routes";

const TITLE = "AI Chat, Document Q&A & AI Apps Platform";
const DESCRIPTION = `${BRAND_NAME} is an AI workspace for chatting with documents and webpages, plus a catalog of focused AI apps for creators, students, and teams.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/welcome" },
  openGraph: {
    type: "website",
    title: `${BRAND_NAME} — ${TITLE}`,
    description: DESCRIPTION,
    url: "/welcome",
    siteName: BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — ${TITLE}`,
    description: DESCRIPTION,
  },
};

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Conversational AI",
    body: "Fast, streaming chat with a clean, app-like experience across desktop and mobile.",
  },
  {
    icon: FileText,
    title: "Chat with documents",
    body: "Upload PDFs and ask questions. Answers are grounded in your files, with sources.",
  },
  {
    icon: Globe,
    title: "Import any webpage",
    body: "Drop in a public URL to summarize articles, docs, and help pages instantly.",
  },
  {
    icon: LayoutGrid,
    title: "A catalog of AI apps",
    body: "Purpose-built tools for images, branding, research, and project planning — each with its own page.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Your chats stay yours. Public marketing pages are indexed; your workspace is not.",
  },
  {
    icon: Zap,
    title: "Built for speed",
    body: "Next.js App Router, server rendering, and lightweight UI keep everything snappy.",
  },
];

const FAQ = [
  {
    q: `What is ${BRAND_NAME}?`,
    a: `${BRAND_NAME} is an AI workspace that combines conversational chat, document and webpage Q&A, and a catalog of specialized AI apps in one place.`,
  },
  {
    q: "Can I chat with my own documents?",
    a: "Yes. Upload a PDF or paste a webpage URL, then ask questions. Responses are grounded in the content you provide.",
  },
  {
    q: "Is there a free plan?",
    a: `Yes — you can start for free and upgrade for higher limits and Pro model access. See the pricing page for details.`,
  },
  {
    q: "What are the AI apps?",
    a: "Each app is a focused tool — for example image generation, branding, research, and project planning — with its own dedicated page and workspace.",
  },
];

export default function WelcomePage() {
  const showcaseApps = (featuredApps.length ? featuredApps : visibleAppsCatalog).slice(0, 6);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND_NAME,
      url: chatConfig.url,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: BRAND_NAME,
      url: chatConfig.url,
      potentialAction: {
        "@type": "SearchAction",
        target: `${chatConfig.url}/apps?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">
              {BRAND_NAME.charAt(0)}
            </span>
            <span className="text-[15px] font-semibold tracking-tight">{BRAND_NAME}</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
            <Link href={routes.apps.store} className="transition-colors hover:text-foreground">
              Apps
            </Link>
            <Link href={routes.plans} className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={routes.home}
              className="hidden rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href={routes.home}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="home-warm-canvas relative overflow-hidden">
        <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-20 text-center sm:px-8 sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3.5 py-1 text-[13px] font-medium text-foreground/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.06]">
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            One workspace for chat, documents & AI apps
          </span>
          <h1 className="mt-7 text-[2.75rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-[3.5rem]">
            The AI workspace that
            <br className="hidden sm:block" /> actually gets work done
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            {DESCRIPTION}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={routes.home}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={routes.apps.store}
              className="inline-flex w-full items-center justify-center rounded-full border border-black/[0.1] bg-white/70 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white dark:border-white/[0.12] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] sm:w-auto"
            >
              Explore apps
            </Link>
          </div>
        </div>
      </section>

      {/* Apps showcase */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
            App catalog
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Focused AI apps, one account</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Each app has its own page, workspace, and purpose — discover the right tool for the job.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showcaseApps.map((app) => (
            <Link
              key={app.id}
              href={getAppDetailHref(app)}
              className="glass-surface glass-card glass-card-interactive group relative overflow-hidden rounded-2xl p-5"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${app.heroGradient} text-white shadow-sm`}
              >
                <span className="text-base font-bold">{app.name.charAt(0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold">{app.name}</h3>
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {app.tier}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {app.shortDescription}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {app.rating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground/70 transition-colors group-hover:text-foreground">
                  View app
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href={routes.apps.store}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
          >
            Browse the full catalog
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="mb-12 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              Why {BRAND_NAME}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Everything in one place</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-2xl border border-border/50 bg-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border/60 bg-card p-5 [&_summary]:cursor-pointer"
            >
              <summary className="flex items-center justify-between text-[15px] font-semibold marker:content-none">
                {item.q}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <div className="home-warm-canvas relative overflow-hidden rounded-3xl border border-black/[0.06] px-6 py-16 text-center dark:border-white/[0.08]">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Create your free account and start chatting in seconds.
          </p>
          <Link
            href={routes.home}
            className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
              {BRAND_NAME.charAt(0)}
            </span>
            <span className="font-medium text-foreground">{BRAND_NAME}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href={routes.apps.store} className="transition-colors hover:text-foreground">
              Apps
            </Link>
            <Link href={routes.plans} className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href={routes.home} className="transition-colors hover:text-foreground">
              Open app
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
