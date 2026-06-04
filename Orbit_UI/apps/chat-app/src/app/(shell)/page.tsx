"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  FolderOpen,
  Globe,
  Loader2,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { navigateToChatLaunch } from "@/lib/chat-navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAppShell } from "@/components/layout/app-shell-context";
import { uploadPdfAndWait, validatePdfFile, PdfUploadCancelledError } from "@/lib/rag-upload";
import { importWebpageUrl, normalizeWebpageUrl, validateWebpageUrl, webpageLabelFromUrl, type WebpageDraft } from "@/lib/web-url-import";
import { buildLibraryComposerItems, mapLibraryUploadToSource } from "@/lib/library-composer";
import { useLibrary } from "@/hooks/use-library";
import { useDoubleBackspace } from "@/hooks/use-double-backspace";
import { HomeMobileContent } from "@/components/home/home-mobile-content";
import { ComposerToolsMenu } from "@/components/chat/composer-tools-menu";
import { WebpageContextChip } from "@/components/chat/web-url-attach-modal";
import { WebpageUrlComposerField } from "@/components/chat/webpage-url-composer-field";
import { LibraryComposerField } from "@/components/chat/library-composer-field";
import { randomId } from "@/lib/utils";
import type { StudySource } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { setHeader, openAuthPrompt } = useAppShell();
  const { uploads: libraryUploads, loading: libraryLoading, refresh: refreshLibrary } = useLibrary();
  const { handleBackspace: handleRemoveWebpageBackspace, resetBackspace: resetWebpageBackspace } =
    useDoubleBackspace(() => setAttachedWebpage(null));

  const [chatInput, setChatInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedWebpage, setAttachedWebpage] = useState<WebpageDraft | null>(null);
  const [webpageInputMode, setWebpageInputMode] = useState(false);
  const [webpageUrlInput, setWebpageUrlInput] = useState("");
  const [webpageUrlError, setWebpageUrlError] = useState("");
  const [libraryInputMode, setLibraryInputMode] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [attachedLibrarySource, setAttachedLibrarySource] = useState<StudySource | null>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeader(null);
    return () => setHeader(null);
  }, [setHeader]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(validatePdfFile);
    if (files.length) {
      setAttachedFiles((prev) => [...prev, ...files]);
      setAttachedWebpage(null);
      setAttachedLibrarySource(null);
      setHeroUploadError("");
    } else if (e.target.files?.length) {
      setHeroUploadError("Only PDF files are supported.");
    }
    if (e.target) e.target.value = "";
  };

  const removeFile = (idx: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const canSend =
    !webpageInputMode &&
    !libraryInputMode &&
    (chatInput.trim().length > 0 || attachedFiles.length > 0 || attachedWebpage || attachedLibrarySource) &&
    !heroUploading;

  const canAttachWebpage =
    webpageInputMode && webpageUrlInput.trim().length > 0 && !heroUploading;

  const enterWebpageMode = () => {
    setWebpageInputMode(true);
    setWebpageUrlInput("");
    setWebpageUrlError("");
    setHeroUploadError("");
  };

  const cancelWebpageMode = () => {
    setWebpageInputMode(false);
    setWebpageUrlInput("");
    setWebpageUrlError("");
  };

  const enterLibraryMode = () => {
    if (!isAuthenticated) {
      openAuthPrompt();
      return;
    }
    setLibraryInputMode(true);
    setLibrarySearch("");
    setHeroUploadError("");
    void refreshLibrary();
  };

  const cancelLibraryMode = () => {
    setLibraryInputMode(false);
    setLibrarySearch("");
  };

  const selectLibraryUpload = (uploadId: string) => {
    const upload = libraryUploads.find((item) => item.id === uploadId);
    if (!upload) return;
    setAttachedLibrarySource(mapLibraryUploadToSource(upload));
    setAttachedFiles([]);
    setAttachedWebpage(null);
    setLibraryInputMode(false);
    setLibrarySearch("");
    setHeroUploadError("");
  };

  const confirmWebpageUrl = () => {
    const validationError = validateWebpageUrl(webpageUrlInput);
    if (validationError) {
      setWebpageUrlError(validationError);
      return;
    }
    const normalized = normalizeWebpageUrl(webpageUrlInput);
    setAttachedWebpage({
      url: normalized,
      label: webpageLabelFromUrl(normalized),
    });
    setAttachedFiles([]);
    setAttachedLibrarySource(null);
    setWebpageInputMode(false);
    setWebpageUrlInput("");
    setWebpageUrlError("");
    setHeroUploadError("");
  };

  const handleHeroSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed && attachedFiles.length === 0 && !attachedWebpage) return;

    if (!isAuthenticated) {
      openAuthPrompt();
      return;
    }

    if (attachedLibrarySource) {
      navigateToChatLaunch(router, {
        prompt: trimmed || "Summarize this document",
        sendKey: randomId(),
        source: attachedLibrarySource,
      });
      return;
    }

    if (attachedWebpage) {
      setHeroUploading(true);
      setHeroUploadError("");
      try {
        const source = await importWebpageUrl(attachedWebpage.url);
        navigateToChatLaunch(router, {
          prompt: trimmed || `Summarize and answer questions about ${attachedWebpage.label}`,
          sendKey: randomId(),
          source,
        });
      } catch (err) {
        setHeroUploadError(err instanceof Error ? err.message : "Webpage import failed");
      } finally {
        setHeroUploading(false);
      }
      return;
    }

    if (attachedFiles.length > 0) {
      setHeroUploading(true);
      setHeroUploadError("");
      try {
        const source = await uploadPdfAndWait(attachedFiles[0]);
        navigateToChatLaunch(router, {
          prompt: trimmed || "Summarize this document",
          sendKey: randomId(),
          source,
        });
      } catch (err) {
        if (err instanceof PdfUploadCancelledError) return;
        setHeroUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setHeroUploading(false);
      }
      return;
    }

    navigateToChatLaunch(router, {
      prompt: trimmed,
      sendKey: randomId(),
    });
  };

  const libraryComposerItems = buildLibraryComposerItems(libraryUploads);

  const composerTools = [
    {
      id: "pdf",
      label: "Upload PDF",
      description: "Attach documents for instant AI analysis",
      icon: Paperclip,
      iconGradient: "from-orange-500 via-amber-500 to-yellow-400",
      active: attachedFiles.length > 0,
      onSelect: () => fileInputRef.current?.click(),
    },
    {
      id: "webpage",
      label: "Webpage",
      description: "Import docs, articles & help pages from any URL",
      icon: Globe,
      iconGradient: "from-sky-500 via-cyan-400 to-teal-400",
      badge: "New",
      active: !!attachedWebpage || webpageInputMode,
      onSelect: enterWebpageMode,
    },
    {
      id: "library",
      label: "Library",
      description: "Browse files you've saved before",
      icon: FolderOpen,
      iconGradient: "from-violet-500 via-purple-500 to-indigo-500",
      active: !!attachedLibrarySource || libraryInputMode,
      onSelect: enterLibraryMode,
    },
  ];

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col md:hidden">
        <HomeMobileContent />
      </div>

      <div className="relative hidden min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:flex">
        <div className="aurora" aria-hidden />
        <div className="grid-dots pointer-events-none absolute inset-0 opacity-35" aria-hidden />

        <div className="relative mx-auto w-full max-w-7xl space-y-8 px-6 py-10 lg:px-8">
          <div className="space-y-4 pt-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
              <Sparkles className="h-3 w-3" />
              Clovai Chat
            </span>
            <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-gradient lg:text-6xl">
              What can I help you with?
            </h1>
            <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
              Ask anything. Tap <span className="font-medium text-foreground/80">+</span> to add PDFs, webpages, or library files.
            </p>
          </div>

          <div className="relative mx-auto max-w-3xl">
            {(attachedFiles.length > 0 || attachedWebpage || attachedLibrarySource || heroUploading) && (
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {heroUploading && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 to-violet-500/10 px-3 py-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    {attachedWebpage ? "Importing webpage…" : "Indexing PDF…"}
                  </span>
                )}
                {attachedWebpage && !heroUploading ? (
                  <WebpageContextChip draft={attachedWebpage} onRemove={() => setAttachedWebpage(null)} />
                ) : null}
                {attachedFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-gradient-to-r from-orange-500/10 to-amber-500/5 px-3 py-1 text-xs shadow-mac backdrop-blur"
                  >
                    <Paperclip className="h-3 w-3 text-orange-500" />
                    <span className="max-w-[180px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {attachedLibrarySource && !heroUploading ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-gradient-to-r from-orange-500/10 to-amber-500/5 px-3 py-1 text-xs shadow-mac backdrop-blur">
                    <Paperclip className="h-3 w-3 text-orange-500" />
                    <span className="max-w-[200px] truncate">{attachedLibrarySource.name}</span>
                    <button
                      onClick={() => setAttachedLibrarySource(null)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
              </div>
            )}

            <div ref={composerRef} className="gradient-border rounded-[28px] bg-card/90 p-3 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.4)] backdrop-blur-xl sm:p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex items-center gap-2">
                {libraryInputMode ? (
                  <LibraryComposerField
                    items={libraryComposerItems}
                    search={librarySearch}
                    onSearchChange={setLibrarySearch}
                    onSelectItem={selectLibraryUpload}
                    onCancel={cancelLibraryMode}
                    onUploadNew={() => {
                      cancelLibraryMode();
                      fileInputRef.current?.click();
                    }}
                    loading={libraryLoading}
                    size="lg"
                  />
                ) : webpageInputMode ? (
                  <WebpageUrlComposerField
                    value={webpageUrlInput}
                    onChange={(value) => {
                      setWebpageUrlInput(value);
                      if (webpageUrlError) setWebpageUrlError("");
                    }}
                    onSubmit={confirmWebpageUrl}
                    onCancel={cancelWebpageMode}
                    error={webpageUrlError}
                    loading={heroUploading}
                    size="lg"
                  />
                ) : (
                  <div className="group relative flex h-12 min-w-0 flex-1 items-center gap-1 rounded-2xl border border-border/50 bg-background/70 px-2 transition-all duration-300 focus-within:border-primary/40 focus-within:bg-background focus-within:shadow-[0_12px_32px_-16px_rgba(99,102,241,0.35)] focus-within:ring-4 focus-within:ring-primary/10 sm:h-14 sm:rounded-[22px] sm:gap-1.5 sm:pl-2.5 sm:pr-4">
                    <ComposerToolsMenu
                      tools={composerTools}
                      disabled={heroUploading}
                      placement="bottom"
                      size="md"
                      variant="inline"
                    />
                    <input
                      value={chatInput}
                      onChange={(e) => {
                        setChatInput(e.target.value);
                        resetWebpageBackspace();
                      }}
                      onKeyDown={(e) => {
                        if (attachedWebpage) {
                          const atStart =
                            !chatInput && (e.currentTarget.selectionStart ?? 0) === 0;
                          if (handleRemoveWebpageBackspace(atStart, e)) return;
                        }
                        if (e.key === "Enter" && !e.shiftKey && canSend) {
                          e.preventDefault();
                          void handleHeroSend();
                        }
                      }}
                      placeholder={
                        attachedWebpage
                          ? `Ask about ${attachedWebpage.label}…`
                          : attachedLibrarySource
                            ? `Ask about ${attachedLibrarySource.name}…`
                          : attachedFiles.length
                            ? "Ask about your PDF…"
                            : "Ask anything…"
                      }
                      disabled={heroUploading}
                      className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/65 sm:text-base"
                    />
                    {chatInput && (
                      <button
                        onClick={() => setChatInput("")}
                        className="press inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground/80 transition-colors hover:bg-foreground/15 hover:text-foreground"
                        title="Clear"
                        aria-label="Clear"
                      >
                        <X className="h-3 w-3" strokeWidth={3} />
                      </button>
                    )}
                  </div>
                )}

                {!libraryInputMode ? (
                  <button
                    type="button"
                    onClick={() => (webpageInputMode ? confirmWebpageUrl() : void handleHeroSend())}
                    disabled={webpageInputMode ? !canAttachWebpage : !canSend}
                    className={`press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 sm:h-14 sm:w-14 sm:rounded-[22px] ${
                      webpageInputMode
                        ? canAttachWebpage
                          ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/30 hover:brightness-105"
                          : "bg-muted text-muted-foreground"
                        : canSend
                          ? "bg-gradient-to-br from-primary via-violet-500 to-sky-500 text-white shadow-lg shadow-primary/30 hover:brightness-105"
                          : "bg-muted text-muted-foreground"
                    }`}
                    aria-label={webpageInputMode ? "Attach webpage" : "Send"}
                  >
                    {heroUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {libraryInputMode ? (
                <>Pick a file from your library · <kbd className="rounded-md border bg-card/60 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to cancel</>
              ) : webpageInputMode ? (
                <>
                  Paste a public URL ·{" "}
                  <kbd className="rounded-md border bg-card/60 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to attach ·{" "}
                  <kbd className="rounded-md border bg-card/60 px-1.5 py-0.5 font-mono text-[10px]">Backspace</kbd> twice or{" "}
                  <kbd className="rounded-md border bg-card/60 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to cancel
                </>
              ) : heroUploading ? (
                attachedWebpage
                  ? "Fetching and indexing webpage content…"
                  : "Uploading and indexing your PDF…"
              ) : (
                <>
                  Open <span className="font-medium text-foreground/70">+</span> for document context ·{" "}
                  <kbd className="rounded-md border bg-card/60 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to send
                </>
              )}
            </p>
            {heroUploadError && (
              <p className="mt-2 text-center text-[11px] text-destructive">{heroUploadError}</p>
            )}
          </div>

          {isAuthenticated && (
            <div className="space-y-4">
              <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                What&apos;s New
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Webpage Context",
                    description: "Attach any public doc URL and ask questions grounded in that page.",
                    tag: "New",
                    gradient: "from-sky-500/15 to-cyan-500/10",
                    tagColor: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
                  },
                  {
                    title: "Clovai Insights",
                    description: "Upload papers and reports for structured summaries and insights.",
                    tag: "App",
                    gradient: "from-emerald-500/15 to-teal-500/10",
                    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    title: "40% Faster Responses",
                    description: "Near-instant responses across chat and apps.",
                    tag: "Speed",
                    gradient: "from-amber-500/15 to-orange-500/10",
                    tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={`gradient-border shimmer hover-lift space-y-2 rounded-2xl border border-border/30 bg-gradient-to-br ${item.gradient} p-5`}
                  >
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
