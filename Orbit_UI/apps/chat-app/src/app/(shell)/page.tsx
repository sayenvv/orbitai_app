"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FolderOpen, Loader2, Paperclip, Search, X } from "lucide-react";
import { AgentCardTint, AgentListingIcon } from "@orbit/ui";
import { navigateToAgentChat, navigateToChatLaunch } from "@/lib/chat-navigation";
import { libraryItems } from "@/lib/home-data";
import { useAgents } from "@/hooks/use-agents";
import { useAuthStore } from "@/store/auth-store";
import { useAppShell } from "@/components/layout/app-shell-context";
import { uploadPdfAndWait, validatePdfFile, PdfUploadCancelledError } from "@/lib/rag-upload";
import { HomeMobileContent } from "@/components/home/home-mobile-content";
import { LibraryPicker } from "@/components/home/library-picker";
import { randomId } from "@/lib/utils";

export default function HomePage() {
  const { agents } = useAgents();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { setSection, setHeader, openAuthPrompt } = useAppShell();

  const [chatInput, setChatInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHeader(null);
    return () => setHeader(null);
  }, [setHeader]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(validatePdfFile);
    if (files.length) {
      setAttachedFiles((prev) => [...prev, ...files]);
      setHeroUploadError("");
    } else if (e.target.files?.length) {
      setHeroUploadError("Only PDF files are supported.");
    }
    if (e.target) e.target.value = "";
  };

  const removeFile = (idx: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleHeroSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed && attachedFiles.length === 0) return;

    if (!isAuthenticated) {
      openAuthPrompt();
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

  const selectedLibraryItem = selectedLibraryId
    ? libraryItems.find((item) => item.id === selectedLibraryId)
    : null;

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col md:hidden">
        <HomeMobileContent />
      </div>

      <div className="hidden min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-6 py-8 md:flex">
        <div className="relative mx-auto w-full max-w-7xl space-y-6 px-2 sm:px-4 lg:px-6">
          <div className="space-y-3 pt-4 text-center">
            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-gradient">
              What can I help you with?
            </h1>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
              Choose a specialized AI assistant or ask anything directly.
            </p>
          </div>

          <div className="relative mx-auto max-w-3xl">
            {(attachedFiles.length > 0 || selectedLibraryId || heroUploading) && (
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {heroUploading && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    Indexing PDF…
                  </span>
                )}
                {attachedFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs shadow-mac backdrop-blur"
                  >
                    <Paperclip className="h-3 w-3 text-primary" />
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
                {selectedLibraryItem && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs shadow-mac">
                    <BookOpen className="h-3 w-3 text-primary" />
                    <span className="max-w-[200px] truncate">{selectedLibraryItem.title}</span>
                    <button
                      onClick={() => setSelectedLibraryId(null)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            <div className="rounded-3xl border border-border/60 bg-card/90 p-3 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="group relative flex h-12 w-full items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-3 transition-all duration-300 hover:border-primary/30 hover:bg-card/95 focus-within:border-primary/60 focus-within:bg-card focus-within:shadow-[0_18px_40px_-18px_rgba(59,130,246,0.45)] focus-within:ring-4 focus-within:ring-primary/12 sm:h-14 sm:rounded-[28px] sm:px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground/90 transition-colors group-focus-within:text-primary sm:h-4.5 sm:w-4.5" />
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !heroUploading) {
                      e.preventDefault();
                      void handleHeroSend();
                    }
                  }}
                  placeholder={attachedFiles.length ? "Ask about your PDF…" : "Ask anything…"}
                  disabled={heroUploading}
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-base"
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

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={heroUploading}
                  className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 dark:bg-muted/40 sm:gap-1.5 sm:px-3 sm:text-[13px]"
                >
                  <Paperclip className="h-3.5 w-3.5 text-primary" />
                  <span>Upload PDF</span>
                </button>
                <button
                  ref={libraryButtonRef}
                  onClick={() => setLibraryOpen((o) => !o)}
                  className={`press inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-[13px] ${
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

            <p className="mt-2 hidden text-center text-[11px] text-muted-foreground sm:mt-3 sm:block">
              {heroUploading
                ? "Uploading and indexing your PDF…"
                : (
                  <>
                    Attach a PDF for document Q&amp;A ·{" "}
                    <kbd className="rounded-md border bg-card/60 px-1.5 py-0.5 font-mono text-[10px]">
                      Enter
                    </kbd>{" "}
                    to send
                  </>
                )}
            </p>
            {heroUploadError && (
              <p className="mt-2 text-center text-[11px] text-destructive">{heroUploadError}</p>
            )}
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Popular agents
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSection("agents");
                  router.push("/?section=agents");
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {agents.slice(0, 3).map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => navigateToAgentChat(router, agent.id)}
                  className="w-full text-left"
                >
                  <AgentCardTint
                    colorKey={agent.colorKey}
                    className="group relative flex w-full items-start gap-3 p-3 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99] sm:gap-4 sm:p-4"
                  >
                    <AgentListingIcon
                      iconKey={agent.iconKey}
                      colorKey={agent.colorKey}
                      className="shrink-0 transition-transform group-hover:scale-105"
                    />
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-semibold transition-colors group-hover:text-primary">
                        {agent.name}
                      </h3>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {agent.description}
                      </p>
                    </div>
                  </AgentCardTint>
                </button>
              ))}
            </div>
          </div>

          {isAuthenticated && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                What&apos;s New
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  {
                    title: "Trip Adviser Agent",
                    description: "Plan vacations with AI-powered itineraries and hotel picks.",
                    tag: "New",
                    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    title: "File Upload Support",
                    description: "Upload PDFs and documents for instant AI analysis.",
                    tag: "Feature",
                    tagColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  },
                  {
                    title: "40% Faster Responses",
                    description: "Near-instant responses across all agents.",
                    tag: "Speed",
                    tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="space-y-2 rounded-xl border border-border/40 bg-card/50 p-4"
                  >
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
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
    </>
  );
}
