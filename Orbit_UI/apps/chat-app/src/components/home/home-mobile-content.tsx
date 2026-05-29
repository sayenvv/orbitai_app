"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, BookOpen, FolderOpen, Paperclip, X } from "lucide-react";
import { AgentListingIcon } from "@orbit/ui";
import { getGreeting, libraryItems, routeForAgent } from "@/lib/home-data";
import { useAgents } from "@/hooks/use-agents";
import { useAuthStore } from "@/store/auth-store";
import { useAppShell } from "@/components/layout/app-shell-context";
import { LibraryPicker } from "@/components/home/library-picker";

export function HomeMobileContent() {
  const { agents } = useAgents();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { openLogin } = useAppShell();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryButtonRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  const displayName = user?.name || "User";
  const selectedLibraryItem = selectedLibraryId
    ? libraryItems.find((item) => item.id === selectedLibraryId)
    : null;

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && !selectedLibraryId) return;
    router.push(`/c?prompt=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain safe-x px-4 pb-4">
        <div className="mb-5 pt-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
            {getGreeting()}
          </p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-foreground">
            {isAuthenticated ? `Hi, ${displayName.split(" ")[0]}` : "What can I help you with?"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose an assistant or start typing below.
          </p>
        </div>

        {selectedLibraryItem && (
          <div className="mb-3 flex justify-center">
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
          </div>
        )}

        <section className="mb-6">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assistants
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => router.push(routeForAgent(agent.id))}
                className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
              >
                <AgentListingIcon iconKey={agent.iconKey} colorKey={agent.colorKey} size="lg" />
                <span className="max-w-[4.5rem] truncate text-[10px] font-medium text-foreground/80">
                  {agent.shortName}
                </span>
              </button>
            ))}
          </div>
        </section>

        {!isAuthenticated && (
          <section className="mb-4 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Keep your work in one place</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in to save chats, reuse files, and continue where you left off.
            </p>
            <button
              onClick={() => openLogin("register")}
              className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm"
            >
              Create account
            </button>
          </section>
        )}
      </div>

      <div className="safe-bottom safe-x shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-md">
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-3xl border border-border/60 bg-card/90 p-3 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <input ref={fileInputRef} type="file" multiple className="hidden" />

            <div className="group relative flex items-end gap-2 rounded-2xl border border-border/60 bg-background/80 p-2 transition-all duration-300 hover:border-primary/30 hover:bg-card/95 focus-within:border-primary/60 focus-within:bg-card focus-within:shadow-[0_18px_40px_-18px_rgba(59,130,246,0.45)] focus-within:ring-4 focus-within:ring-primary/12">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Ask anything…"
                className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-base leading-snug outline-none placeholder:text-muted-foreground/60"
              />

              {message.trim() && (
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground/80 hover:bg-foreground/15 hover:text-foreground"
                  aria-label="Clear"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              )}

              <button
                type="button"
                onClick={handleSend}
                disabled={!message.trim() && !selectedLibraryId}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-muted/60 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground dark:bg-muted/40"
              >
                <Paperclip className="h-3.5 w-3.5 text-primary" />
                Upload
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
