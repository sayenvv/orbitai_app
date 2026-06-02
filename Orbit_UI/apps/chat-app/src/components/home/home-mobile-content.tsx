"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { getGreeting } from "@/lib/home-data";
import { navigateToChatLaunch } from "@/lib/chat-navigation";
import { uploadPdfAndWait, validatePdfFile, PdfUploadCancelledError } from "@/lib/rag-upload";
import {
  importWebpageUrl,
  normalizeWebpageUrl,
  validateWebpageUrl,
  webpageLabelFromUrl,
  type WebpageDraft,
} from "@/lib/web-url-import";
import { buildLibraryComposerItems, mapLibraryUploadToSource } from "@/lib/library-composer";
import { useLibrary } from "@/hooks/use-library";
import { useDoubleBackspace } from "@/hooks/use-double-backspace";
import { useAuthStore } from "@/store/auth-store";
import { useAppShell } from "@/components/layout/app-shell-context";
import { ComposerToolsMenu } from "@/components/chat/composer-tools-menu";
import { WebpageContextChip } from "@/components/chat/web-url-attach-modal";
import { WebpageUrlComposerField } from "@/components/chat/webpage-url-composer-field";
import { LibraryComposerField } from "@/components/chat/library-composer-field";
import { randomId } from "@/lib/utils";
import type { StudySource } from "@/types";

export function HomeMobileContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { openAuthPrompt } = useAppShell();
  const { uploads: libraryUploads, loading: libraryLoading, refresh: refreshLibrary } = useLibrary();
  const { handleBackspace: handleRemoveWebpageBackspace, resetBackspace: resetWebpageBackspace } =
    useDoubleBackspace(() => setAttachedWebpage(null));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedWebpage, setAttachedWebpage] = useState<WebpageDraft | null>(null);
  const [attachedLibrarySource, setAttachedLibrarySource] = useState<StudySource | null>(null);
  const [webpageInputMode, setWebpageInputMode] = useState(false);
  const [webpageUrlInput, setWebpageUrlInput] = useState("");
  const [webpageUrlError, setWebpageUrlError] = useState("");
  const [libraryInputMode, setLibraryInputMode] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const displayName = user?.name || "User";
  const libraryComposerItems = buildLibraryComposerItems(libraryUploads);

  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;

    const updateHeight = () => setComposerHeight(el.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (webpageInputMode || libraryInputMode) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [message, webpageInputMode, libraryInputMode]);

  const enterWebpageMode = () => {
    setWebpageInputMode(true);
    setWebpageUrlInput("");
    setWebpageUrlError("");
    setUploadError("");
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
    setUploadError("");
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
    setAttachedFile(null);
    setAttachedWebpage(null);
    setLibraryInputMode(false);
    setLibrarySearch("");
    setUploadError("");
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
    setAttachedFile(null);
    setAttachedLibrarySource(null);
    setWebpageInputMode(false);
    setWebpageUrlInput("");
    setWebpageUrlError("");
    setUploadError("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validatePdfFile(file)) {
      setAttachedFile(file);
      setAttachedWebpage(null);
      setAttachedLibrarySource(null);
      setUploadError("");
    } else if (file) {
      setUploadError("Only PDF files are supported.");
    }
    if (e.target) e.target.value = "";
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed && !attachedFile && !attachedWebpage && !attachedLibrarySource) return;

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
      setUploading(true);
      setUploadError("");
      try {
        const source = await importWebpageUrl(attachedWebpage.url);
        navigateToChatLaunch(router, {
          prompt: trimmed || `Summarize and answer questions about ${attachedWebpage.label}`,
          sendKey: randomId(),
          source,
        });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Webpage import failed");
      } finally {
        setUploading(false);
      }
      return;
    }

    if (attachedFile) {
      setUploading(true);
      setUploadError("");
      try {
        const source = await uploadPdfAndWait(attachedFile);
        navigateToChatLaunch(router, {
          prompt: trimmed || "Summarize this document",
          sendKey: randomId(),
          source,
        });
      } catch (err) {
        if (err instanceof PdfUploadCancelledError) return;
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
      return;
    }

    navigateToChatLaunch(router, {
      prompt: trimmed,
      sendKey: randomId(),
    });
  };

  const canSend =
    !webpageInputMode &&
    !libraryInputMode &&
    (message.trim().length > 0 || attachedFile || attachedWebpage || attachedLibrarySource) &&
    !uploading;
  const canAttachWebpage =
    webpageInputMode && webpageUrlInput.trim().length > 0 && !uploading;

  const composerTools = [
    {
      id: "pdf",
      label: "Upload PDF",
      description: "Attach documents for instant AI analysis",
      icon: Paperclip,
      iconGradient: "from-orange-500 via-amber-500 to-yellow-400",
      active: !!attachedFile,
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
    <div className="relative h-full min-h-0 flex-1">
      <div className="aurora opacity-80" aria-hidden />
      <div className="grid-dots pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div
        className="relative h-full overflow-x-hidden overflow-y-auto overscroll-y-contain safe-x"
        style={{ paddingBottom: composerHeight > 0 ? composerHeight + 8 : undefined }}
      >
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 text-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/75">
            <Sparkles className="h-2.5 w-2.5" />
            Clovai
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
            {getGreeting()}
          </p>
          <h1 className="mt-2 text-[28px] font-bold leading-[1.1] tracking-tight text-gradient">
            {isAuthenticated ? `Hi, ${displayName.split(" ")[0]}` : "What can I help you with?"}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {isAuthenticated
              ? "Ask anything. Tap + to add PDFs, webpages, or library files."
              : "Start a conversation or sign in to save your chats."}
          </p>

          {(attachedLibrarySource || attachedFile || attachedWebpage) && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {attachedWebpage ? (
                <WebpageContextChip draft={attachedWebpage} onRemove={() => setAttachedWebpage(null)} compact />
              ) : null}
              {attachedFile && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-gradient-to-r from-orange-500/10 to-amber-500/5 px-3 py-1 text-xs shadow-sm">
                  <Paperclip className="h-3 w-3 text-orange-500" />
                  <span className="max-w-[160px] truncate">{attachedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove PDF"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {attachedLibrarySource && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-gradient-to-r from-orange-500/10 to-amber-500/5 px-3 py-1 text-xs shadow-sm">
                  <Paperclip className="h-3 w-3 text-orange-500" />
                  <span className="max-w-[200px] truncate">{attachedLibrarySource.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedLibrarySource(null)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove library file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        ref={composerRef}
        className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent safe-bottom safe-x"
      >
        <div className="mx-auto w-full max-w-2xl px-3 pb-3 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="gradient-border rounded-[26px] bg-card/80 p-2 backdrop-blur-xl">
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
                  loading={uploading}
                  multiline
                />
              ) : (
                <div className="group flex min-w-0 flex-1 items-center gap-1 rounded-2xl border border-border/50 bg-background/60 pl-1.5 pr-3 transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
                  <ComposerToolsMenu
                    tools={composerTools}
                    disabled={uploading}
                    placement="top"
                    size="md"
                    variant="inline"
                  />

                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      resetWebpageBackspace();
                    }}
                    onKeyDown={(e) => {
                      if (attachedWebpage) {
                        const atStart =
                          !message && (e.currentTarget.selectionStart ?? 0) === 0;
                        if (handleRemoveWebpageBackspace(atStart, e)) return;
                      }
                      if (e.key === "Enter" && !e.shiftKey && canSend) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    rows={1}
                    placeholder={
                      attachedWebpage
                        ? `Ask about ${attachedWebpage.label}…`
                        : attachedLibrarySource
                          ? `Ask about ${attachedLibrarySource.name}…`
                        : attachedFile
                          ? "Ask about your PDF…"
                          : "Ask anything…"
                    }
                    disabled={uploading}
                    className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-snug outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
                  />

                  {message.trim() && !uploading && (
                    <button
                      type="button"
                      onClick={() => setMessage("")}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground/80 hover:bg-foreground/15 hover:text-foreground"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                  )}
                </div>
              )}

              {!libraryInputMode ? (
                <button
                  type="button"
                  onClick={() => (webpageInputMode ? confirmWebpageUrl() : void handleSend())}
                  disabled={webpageInputMode ? !canAttachWebpage : !canSend}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all ${
                    webpageInputMode
                      ? canAttachWebpage
                        ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25"
                        : "bg-muted text-muted-foreground"
                      : canSend
                        ? "bg-gradient-to-br from-primary via-violet-500 to-sky-500 text-white shadow-lg shadow-primary/25"
                        : "bg-muted text-muted-foreground"
                  }`}
                  aria-label={webpageInputMode ? "Attach webpage" : "Send"}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  )}
                </button>
              ) : null}
            </div>
          </div>

          {uploadError && !webpageUrlError && (
            <p className="mt-1.5 text-center text-[11px] text-destructive">{uploadError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
