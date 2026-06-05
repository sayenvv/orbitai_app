"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowUp,
  ChevronDown,
  Code2,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  Mic,
  Paperclip,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ComposerToolsMenu } from "@/components/chat/composer-tools-menu";
import { LibraryComposerField } from "@/components/chat/library-composer-field";
import { WebpageContextChip } from "@/components/chat/web-url-attach-modal";
import { WebpageUrlComposerField } from "@/components/chat/webpage-url-composer-field";
import { useAppShell } from "@/components/layout/app-shell-context";
import { getGreeting } from "@/lib/home-data";
import { routes } from "@/lib/routes";
import { useTokenUsage } from "@/hooks/use-token-usage";
import { useAuthStore } from "@/store/auth-store";
import { useUsageStore } from "@/store/usage-store";
import { cn } from "@/lib/utils";
import type { WebpageDraft } from "@/lib/web-url-import";
import type { StudySource } from "@/types";

type ComposerTool = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconGradient: string;
  badge?: string;
  active?: boolean;
  onSelect: () => void;
};

type HomeDesktopHeroProps = {
  chatInput: string;
  onChatInputChange: (value: string) => void;
  attachedFiles: File[];
  attachedWebpage: WebpageDraft | null;
  onRemoveWebpage: () => void;
  attachedLibrarySource: StudySource | null;
  onRemoveLibrarySource: () => void;
  onRemoveFile: (index: number) => void;
  webpageInputMode: boolean;
  webpageUrlInput: string;
  onWebpageUrlInputChange: (value: string) => void;
  webpageUrlError: string;
  onConfirmWebpageUrl: () => void;
  onCancelWebpageMode: () => void;
  libraryInputMode: boolean;
  librarySearch: string;
  onLibrarySearchChange: (value: string) => void;
  libraryComposerItems: Parameters<typeof LibraryComposerField>[0]["items"];
  onSelectLibraryItem: (uploadId: string) => void;
  onCancelLibraryMode: () => void;
  onUploadNewFromLibrary: () => void;
  libraryLoading: boolean;
  heroUploading: boolean;
  heroUploadError: string;
  canSend: boolean;
  canAttachWebpage: boolean;
  onSend: () => void;
  onFileInputClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  composerTools: ComposerTool[];
  onQuickStartPrompt: (prompt: string) => void;
  onComposerKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

const QUICK_START: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  prompt: string;
  action?: "library" | "pdf";
}> = [
  {
    title: "Write a script",
    description: "Write a TypeScript script that fetches data from an API and processes it.",
    icon: Code2,
    prompt: "Write a TypeScript script that fetches data from an API and processes it.",
  },
  {
    title: "Analyze document",
    description: "Analyze this document and provide a comprehensive summary with key insights.",
    icon: FileText,
    prompt: "Analyze this document and provide a comprehensive summary with key insights.",
    action: "library",
  },
  {
    title: "Brainstorm ideas",
    description: "Brainstorm 10 innovative product ideas for AI-powered tools in 2025.",
    icon: Zap,
    prompt: "Brainstorm 10 innovative product ideas for AI-powered tools in 2025.",
  },
  {
    title: "Research topic",
    description: "Provide a comprehensive research overview on quantum computing and its applications.",
    icon: Globe,
    prompt: "Provide a comprehensive research overview on quantum computing and its applications.",
  },
];

export function HomeDesktopHero({
  chatInput,
  onChatInputChange,
  attachedFiles,
  attachedWebpage,
  onRemoveWebpage,
  attachedLibrarySource,
  onRemoveLibrarySource,
  onRemoveFile,
  webpageInputMode,
  webpageUrlInput,
  onWebpageUrlInputChange,
  webpageUrlError,
  onConfirmWebpageUrl,
  onCancelWebpageMode,
  libraryInputMode,
  librarySearch,
  onLibrarySearchChange,
  libraryComposerItems,
  onSelectLibraryItem,
  onCancelLibraryMode,
  onUploadNewFromLibrary,
  libraryLoading,
  heroUploading,
  heroUploadError,
  canSend,
  canAttachWebpage,
  onSend,
  onFileInputClick,
  onFileChange,
  fileInputRef,
  composerTools,
  onQuickStartPrompt,
  onComposerKeyDown,
}: HomeDesktopHeroProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useTokenUsage();
  const plan = useUsageStore((s) => s.usage?.plan ?? "free");
  const { openUpgrade, openAuthPrompt } = useAppShell();
  const reduceMotion = useReducedMotion();

  const displayName = user?.name?.trim().split(" ")[0] || "there";
  const planLabel = `${plan.charAt(0).toUpperCase()}${plan.slice(1)} Plan`;
  const hasAttachments =
    attachedFiles.length > 0 || Boolean(attachedWebpage) || Boolean(attachedLibrarySource);
  const showUploadProgress =
    heroUploading && (Boolean(attachedWebpage) || attachedFiles.length > 0);

  const handleQuickStart = (item: (typeof QUICK_START)[number]) => {
    if (!isAuthenticated) {
      openAuthPrompt();
      return;
    }
    onQuickStartPrompt(item.prompt);
    if (item.action === "library") {
      composerTools.find((t) => t.id === "library")?.onSelect();
    }
    if (item.action === "pdf") {
      onFileInputClick();
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        <motion.div
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-6"
          variants={heroContainer}
          initial={reduceMotion ? false : "hidden"}
          animate="show"
        >
          {/* Plan badge */}
          <motion.div variants={heroItem} className="flex justify-center">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={plan === "free" ? openUpgrade : openUpgrade}
                className="glass-chip glass-card inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[13px] transition hover:border-[color-mix(in_oklab,var(--workspace-tab-border)_55%,var(--foreground)_45%)]"
              >
                <span className="font-medium text-foreground/80">{planLabel}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="font-semibold text-violet-600 dark:text-violet-400">Upgrade</span>
              </button>
            ) : (
              <Link
                href={routes.plans}
                className="glass-chip glass-card inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[13px] transition hover:border-[color-mix(in_oklab,var(--workspace-tab-border)_55%,var(--foreground)_45%)]"
              >
                <span className="font-medium text-foreground/80">Free Plan</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="font-semibold text-violet-600 dark:text-violet-400">Upgrade</span>
              </Link>
            )}
          </motion.div>

          {/* Greeting */}
          <motion.h1
            variants={heroItem}
            className="brand-text-gradient mt-6 text-center text-[2rem] font-bold leading-[1.12] tracking-tight sm:mt-7 sm:text-[2.5rem] md:text-[3.25rem] md:leading-[1.05]"
          >
            {isAuthenticated ? `${getGreeting()}, ${displayName}` : "How can I help you today?"}
          </motion.h1>

          {/* Composer */}
          <motion.div variants={heroItem} className="mt-8 sm:mt-10">
            {(hasAttachments || showUploadProgress) && (
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {showUploadProgress ? (
                  <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    {attachedWebpage ? "Importing webpage…" : "Indexing PDF…"}
                  </span>
                ) : null}
                {attachedWebpage && !heroUploading ? (
                  <WebpageContextChip draft={attachedWebpage} onRemove={onRemoveWebpage} />
                ) : null}
                {attachedFiles.map((file, idx) => (
                  <span
                    key={`${file.name}-${idx}`}
                    className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                  >
                    <Paperclip className="h-3 w-3 text-orange-500" />
                    <span className="max-w-[180px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(idx)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {attachedLibrarySource && !heroUploading ? (
                  <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs">
                    <FolderOpen className="h-3 w-3 text-violet-500" />
                    <span className="max-w-[200px] truncate">{attachedLibrarySource.name}</span>
                    <button
                      type="button"
                      onClick={onRemoveLibrarySource}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
              </div>
            )}

            <div className="glass-surface glass-composer glass-card rounded-[1.5rem] px-4 pb-3 pt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={onFileChange}
              />

              {libraryInputMode ? (
                <LibraryComposerField
                  items={libraryComposerItems}
                  search={librarySearch}
                  onSearchChange={onLibrarySearchChange}
                  onSelectItem={onSelectLibraryItem}
                  onCancel={onCancelLibraryMode}
                  onUploadNew={onUploadNewFromLibrary}
                  loading={libraryLoading}
                  size="lg"
                />
              ) : webpageInputMode ? (
                <WebpageUrlComposerField
                  value={webpageUrlInput}
                  onChange={onWebpageUrlInputChange}
                  onSubmit={onConfirmWebpageUrl}
                  onCancel={onCancelWebpageMode}
                  error={webpageUrlError}
                  loading={heroUploading}
                  size="lg"
                />
              ) : (
                <>
                  <textarea
                    value={chatInput}
                    onChange={(e) => onChatInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      onComposerKeyDown?.(e);
                      if (e.defaultPrevented) return;
                      if (e.key === "Enter" && !e.shiftKey && canSend) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    rows={1}
                    placeholder="How can I help you today?"
                    disabled={heroUploading}
                    className="min-h-[2rem] w-full resize-none bg-transparent px-1 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-[15px]"
                  />

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-0.5">
                      <ComposerToolsMenu
                        tools={composerTools}
                        disabled={heroUploading}
                        placement="bottom"
                        size="md"
                        variant="inline"
                      />
                      <button
                        type="button"
                        onClick={onFileInputClick}
                        disabled={heroUploading}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 transition hover:bg-black/[0.04] hover:text-foreground"
                        title="Attach PDF"
                      >
                        <Paperclip className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => composerTools.find((t) => t.id === "webpage")?.onSelect()}
                        disabled={heroUploading}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 transition hover:bg-black/[0.04] hover:text-foreground"
                        title="Attach webpage"
                      >
                        <Globe className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full text-muted-foreground/40"
                        title="Voice input coming soon"
                      >
                        <Mic className="h-[18px] w-[18px]" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground/80 transition hover:text-foreground"
                        title="Model"
                      >
                        Axiom Ultra 3.1
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => (webpageInputMode ? onConfirmWebpageUrl() : void onSend())}
                        disabled={webpageInputMode ? !canAttachWebpage : !canSend}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full transition-all",
                          (webpageInputMode ? canAttachWebpage : canSend)
                        ? "bg-foreground text-background shadow-sm hover:opacity-90"
                          : "bg-black/[0.06] text-muted-foreground/50 dark:bg-white/[0.08]",
                        )}
                        aria-label="Send"
                      >
                        {heroUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {heroUploadError ? (
              <p className="mt-2 text-center text-xs text-destructive">{heroUploadError}</p>
            ) : null}
          </motion.div>

          {/* Quick start */}
          <motion.section variants={heroItem} className="mt-9">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
              Quick start
            </p>

            {/* Mobile: floating wrap chips — no scroll */}
            <div className="flex flex-wrap justify-center gap-2 sm:hidden">
              {QUICK_START.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => handleQuickStart(item)}
                    className="glass-chip glass-card inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-left transition active:scale-[0.98]"
                  >
                    <span className="glass-icon-well flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="whitespace-nowrap text-[13px] font-medium text-foreground">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Desktop: full cards */}
            <div className="hidden gap-3 sm:grid sm:grid-cols-2">
              {QUICK_START.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => handleQuickStart(item)}
                    className="glass-surface glass-card glass-card-interactive group flex items-start gap-3 rounded-2xl p-4 text-left"
                  >
                    <span className="glass-icon-well mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
