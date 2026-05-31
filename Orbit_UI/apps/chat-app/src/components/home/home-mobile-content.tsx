"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, BookOpen, FolderOpen, Loader2, Paperclip, Search, X } from "lucide-react";
import { getGreeting, libraryItems } from "@/lib/home-data";
import { navigateToChatLaunch } from "@/lib/chat-navigation";
import { uploadPdfAndWait, validatePdfFile, PdfUploadCancelledError } from "@/lib/rag-upload";
import { useAuthStore } from "@/store/auth-store";
import { useAppShell } from "@/components/layout/app-shell-context";
import { LibraryPicker } from "@/components/home/library-picker";
import { randomId } from "@/lib/utils";

export function HomeMobileContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { openAuthPrompt } = useAppShell();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryButtonRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  const displayName = user?.name || "User";
  const selectedLibraryItem = selectedLibraryId
    ? libraryItems.find((item) => item.id === selectedLibraryId)
    : null;

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
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [message]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validatePdfFile(file)) {
      setAttachedFile(file);
      setUploadError("");
    } else if (file) {
      setUploadError("Only PDF files are supported.");
    }
    if (e.target) e.target.value = "";
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed && !attachedFile) return;

    if (!isAuthenticated) {
      openAuthPrompt();
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

  const canSend = (message.trim().length > 0 || attachedFile) && !uploading;

  return (
    <div className="relative h-full min-h-0 flex-1">
      <div
        className="h-full overflow-x-hidden overflow-y-auto overscroll-y-contain safe-x"
        style={{ paddingBottom: composerHeight > 0 ? composerHeight + 8 : undefined }}
      >
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
            {getGreeting()}
          </p>
          <h1 className="mt-2 text-[28px] font-bold leading-[1.1] tracking-tight text-gradient">
            {isAuthenticated ? `Hi, ${displayName.split(" ")[0]}` : "What can I help you with?"}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {isAuthenticated
              ? "Ask anything, attach a PDF, or pick a file from your library."
              : "Start a conversation or sign in to save your chats."}
          </p>

          {(selectedLibraryItem || attachedFile) && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {attachedFile && (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs shadow-sm">
                  <Paperclip className="h-3 w-3 text-primary" />
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
              {selectedLibraryItem && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs shadow-sm">
                  <BookOpen className="h-3 w-3 text-primary" />
                  <span className="max-w-[200px] truncate">{selectedLibraryItem.title}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLibraryId(null)}
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
        className="fixed inset-x-0 bottom-0 z-40 bg-transparent safe-bottom safe-x"
      >
        <div className="mx-auto w-full max-w-2xl px-3 pb-3 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="rounded-3xl border-0 bg-transparent p-2">
            <div className="group flex items-center gap-2 rounded-2xl border border-border/50 bg-transparent px-3 py-1 transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground/90 transition-colors group-focus-within:text-primary" />

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && canSend) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={1}
                placeholder={attachedFile ? "Ask about your PDF…" : "Ask anything…"}
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

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                aria-label="Send"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-muted/60 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 dark:bg-muted/40"
              >
                <Paperclip className="h-3.5 w-3.5 text-primary" />
                Upload PDF
              </button>
              <button
                ref={libraryButtonRef}
                type="button"
                onClick={() => setLibraryOpen((open) => !open)}
                className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors ${
                  selectedLibraryId || libraryOpen
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/60 text-foreground/80 hover:bg-muted hover:text-foreground dark:bg-muted/40"
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Library
              </button>
            </div>
          </div>

          {uploadError && (
            <p className="mt-1.5 text-center text-[11px] text-destructive">{uploadError}</p>
          )}
        </div>
      </div>

      <LibraryPicker
        open={libraryOpen}
        anchorRef={libraryButtonRef}
        items={libraryItems}
        search={librarySearch}
        onSearchChange={setLibrarySearch}
        selectedId={selectedLibraryId}
        onSelectItem={setSelectedLibraryId}
        onClearSelection={() => setSelectedLibraryId(null)}
        onClose={() => setLibraryOpen(false)}
        onUploadNew={() => {
          fileInputRef.current?.click();
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}
