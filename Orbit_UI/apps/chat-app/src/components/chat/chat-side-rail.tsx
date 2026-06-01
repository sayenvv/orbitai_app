"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Crown,
  LayoutGrid,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Shield,
} from "lucide-react";

import {
  CHAT_SIDE_RAIL_ADS,
  CHAT_SIDE_RAIL_FOOTER,
  CHAT_SIDE_RAIL_LINKS,
  CHAT_SIDE_RAIL_TIP,
  CHAT_SIDE_RAIL_UPGRADE,
  type ChatSideRailAd,
} from "@/lib/chat-side-rail-content";
import { ChatActionsMenu } from "@/components/chat/chat-actions-menu";
import { ChatSideRailShimmer } from "@/components/ui/skeleton";
import { useChatSideRail } from "@/hooks/use-chat-side-rail";
import { useUsageStore } from "@/store/usage-store";
import type { ChatSideRailSide } from "@/store/chat-side-rail-store";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

type ChatSideRailActions = {
  conversationId: string | null;
  conversationTitle?: string;
  messages: Message[];
  canDelete?: boolean;
  onDelete?: () => void | Promise<void>;
  onNewChat?: () => void;
};

type ChatSideRailProps = {
  side?: ChatSideRailSide;
  className?: string;
  showActionsMenu?: boolean;
  actions?: ChatSideRailActions;
};

function RailSectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground">{children}</h3>
  );
}

function RailAdCard({ ad }: { ad: ChatSideRailAd }) {
  const isExternal = ad.href.startsWith("http");
  const className =
    "group block overflow-hidden rounded-xl bg-card/80 transition-colors hover:bg-card";

  const content = (
    <>
      <div className="relative aspect-[2/1] overflow-hidden bg-muted">
        <Image
          src={ad.imageUrl}
          alt={ad.imageAlt}
          fill
          sizes="268px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
          Ad
        </span>
      </div>
      <div className="space-y-1.5 p-3.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {ad.company}
        </p>
        <p className="text-sm font-semibold leading-snug text-foreground">{ad.title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {ad.description}
        </p>
        <span className="inline-flex items-center gap-1 pt-0.5 text-xs font-medium text-primary">
          {ad.ctaLabel}
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
        </span>
      </div>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={ad.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={ad.href} className={className}>
      {content}
    </Link>
  );
}

export function ChatSideRail({
  side = "right",
  className,
  showActionsMenu,
  actions,
}: ChatSideRailProps) {
  const { open, hydrated, toggle } = useChatSideRail(side);
  const [contentReady, setContentReady] = useState(false);
  const plan = useUsageStore((s) => s.usage?.plan ?? "free");
  const showUpgrade = plan === "free";
  const TipIcon = CHAT_SIDE_RAIL_TIP.icon;
  const upgrade = CHAT_SIDE_RAIL_UPGRADE;

  useEffect(() => {
    if (!open || !hydrated) {
      setContentReady(false);
      return;
    }
    const timer = window.setTimeout(() => setContentReady(true), 450);
    return () => window.clearTimeout(timer);
  }, [open, hydrated]);

  const showShimmer = open && (!hydrated || !contentReady);
  const CollapseIcon = side === "left" ? PanelLeftClose : PanelRightClose;
  const ExpandIcon = side === "left" ? PanelRight : PanelLeft;
  const showRailActions = side === "right" && showActionsMenu;

  return (
    <aside
      className={cn(
        "relative shrink-0 flex-col bg-background transition-[width] duration-300 ease-out",
        open ? "w-[300px]" : "w-[3.25rem]",
        !hydrated && "w-[300px]",
        className,
      )}
      aria-label={side === "left" ? "Chat resources (left)" : "Chat sidebar"}
      aria-expanded={open}
    >
      {open ? (
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col bg-muted/20">
          <header className="flex shrink-0 items-center justify-between gap-3 bg-background px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Resources</p>
              <p className="text-[11px] text-muted-foreground">Partner ads & shortcuts</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              title="Collapse panel"
              aria-label="Collapse panel"
            >
              <CollapseIcon className="h-4 w-4" strokeWidth={2} />
            </button>
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
            {showShimmer ? (
              <ChatSideRailShimmer />
            ) : (
          <div className="flex flex-col gap-4 p-4">
            {showUpgrade && (
              <section className="overflow-hidden rounded-xl bg-card">
                <div className="relative h-[88px] overflow-hidden bg-muted">
                  <Image
                    src={upgrade.imageUrl}
                    alt={upgrade.imageAlt}
                    fill
                    sizes="268px"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-3.5">
                    <span className="inline-flex w-fit items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                      <Crown className="h-3 w-3" />
                      {upgrade.eyebrow}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 p-3.5">
                  <div>
                    <h4 className="text-sm font-semibold leading-snug text-foreground">
                      {upgrade.title}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {upgrade.description}
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {upgrade.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={upgrade.href}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {upgrade.ctaLabel}
                    <ArrowUpRight className="h-4 w-4 opacity-90" />
                  </Link>
                </div>
              </section>
            )}

            <section className="space-y-2.5">
              <RailSectionLabel>From our partners</RailSectionLabel>
              {CHAT_SIDE_RAIL_ADS.map((ad) => (
                <RailAdCard key={ad.id} ad={ad} />
              ))}
            </section>

            <section>
              <RailSectionLabel>Shortcuts</RailSectionLabel>
              <ul className="mt-2 space-y-1 overflow-hidden rounded-xl bg-card">
                {CHAT_SIDE_RAIL_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.id}>
                      <Link
                        href={link.href}
                        className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {link.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {link.description}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-xl bg-card p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <TipIcon className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{CHAT_SIDE_RAIL_TIP.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {CHAT_SIDE_RAIL_TIP.description}
                  </p>
                </div>
              </div>
            </section>

            <footer className="flex items-start gap-2 pb-1 text-[10px] leading-relaxed text-muted-foreground/80">
              <Shield className="mt-0.5 h-3 w-3 shrink-0" />
              <p>
                <span className="font-medium text-muted-foreground">
                  {CHAT_SIDE_RAIL_FOOTER.label}:
                </span>{" "}
                {CHAT_SIDE_RAIL_FOOTER.text}
              </p>
            </footer>
          </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-center bg-muted/20 py-3">
          <button
            type="button"
            onClick={toggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            title="Expand panel"
            aria-label="Expand panel"
          >
            <ExpandIcon className="h-4 w-4" strokeWidth={2} />
          </button>

          {showRailActions && actions && (
            <div className="my-3 flex min-h-0 flex-1 flex-col items-center justify-center overflow-visible">
              <ChatActionsMenu
                variant="rail"
                conversationId={actions.conversationId}
                conversationTitle={actions.conversationTitle}
                messages={actions.messages}
                canDelete={actions.canDelete}
                onDelete={actions.onDelete}
                onNewChat={actions.onNewChat}
              />
            </div>
          )}

          <div className="flex shrink-0 flex-col items-center gap-1.5 pb-1">
            {showUpgrade && (
              <Link
                href="/plans"
                title="Compare plans"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10"
              >
                <Crown className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/?section=agents"
              title="Browse agents"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
