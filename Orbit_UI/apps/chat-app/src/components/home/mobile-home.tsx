"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  BookOpen,
  FolderOpen,
  LogIn,
  Menu,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { LibraryPicker } from "@/components/home/library-picker";
import { SettingsHelpFooterTab } from "@/components/home/support-modal";
import {
  MainAgentsPanel,
  MainLibraryPanel,
  SidebarRecentsList,
  SidebarSectionNav,
  type SidebarSection,
} from "@/components/home/app-sidebar-panels";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { useLibrary } from "@/hooks/use-library";
import { publicApi } from "@/lib/orbit-api";
import { AgentListingIcon } from "@orbit/ui";
import { getGreeting, libraryItems, routeForAgent } from "@/lib/home-data";
import { useAgents } from "@/hooks/use-agents";

type MobileHomeProps = {
  isAuthenticated: boolean;
  displayName: string;
  initials: string;
  onSignIn: () => void;
  onSignUp: () => void;
  onProfile: () => void;
  onOpenSupport: () => void;
};

export function MobileHome({
  isAuthenticated,
  displayName,
  initials,
  onSignIn,
  onSignUp,
  onProfile,
  onOpenSupport,
}: MobileHomeProps) {
  const { agents, loading: agentsLoading } = useAgents();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryButtonRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>("home");
  const [mainSection, setMainSection] = useState<SidebarSection>("home");
  const { conversations, loading: chatsLoading, removeConversation } = useSidebarChats();
  const { uploads, generated, loading: libraryLoading, refresh: refreshLibrary } = useLibrary();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  const selectedLibraryItem = selectedLibraryId
    ? libraryItems.find((item) => item.id === selectedLibraryId)
    : null;

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && !selectedLibraryId) return;
    router.push(`/c?prompt=${encodeURIComponent(trimmed)}`);
  };

  const openAgent = (agentId: string) => {
    router.push(routeForAgent(agentId));
  };

  const openSupport = () => {
    setSidebarOpen(false);
    onOpenSupport();
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const handleSectionChange = (section: SidebarSection) => {
    setSidebarSection(section);
    setMainSection(section);
    if (section === "library" || section === "agents") setSidebarOpen(false);
  };

  const handleNewChat = () => {
    setSidebarSection("home");
    setMainSection("home");
    setSidebarOpen(false);
  };

  const openChat = (id: string) => {
    setSidebarOpen(false);
    router.push(`/c?conversation=${encodeURIComponent(id)}`);
  };

  return (
    <div className="app-shell flex flex-col bg-background">
      <header className="safe-top safe-x flex shrink-0 items-center justify-between px-4 pb-3 pt-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/90 text-foreground shadow-[0_8px_18px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-muted"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Orbit AI</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Your AI assistants</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <button
              onClick={openSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
              aria-label="Menu"
            >
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {isAuthenticated ? (
            <button
              onClick={onProfile}
              className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20"
              aria-label="Profile"
            >
              <span className="text-[10px] font-bold text-primary">{initials}</span>
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="ml-1 flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              <LogIn className="h-3.5 w-3.5" />
              Join
            </button>
          )}
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
              <div>
                <p className="text-sm font-semibold">Orbit AI</p>
                <p className="text-[11px] text-muted-foreground">Navigation</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/70 text-foreground hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
              <SidebarSectionNav
                expanded
                section={sidebarSection}
                onSectionChange={handleSectionChange}
                onNewChat={handleNewChat}
              />

              {isAuthenticated && (
                <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-border/60 pt-3">
                  <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recents
                  </p>
                  <SidebarRecentsList
                    conversations={conversations}
                    loading={chatsLoading}
                    onSelect={openChat}
                    onDelete={(id) => void removeConversation(id)}
                  />
                </div>
              )}

              {!isAuthenticated && (
                <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      onSignIn();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-3 text-left text-sm font-medium shadow-sm transition-all hover:border-primary/30 hover:bg-card"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <LogIn className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block">Sign in / Join</span>
                      <span className="text-[11px] text-muted-foreground">
                        Save chats and library items
                      </span>
                    </span>
                  </button>
                </div>
              )}

              {isAuthenticated && (
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    onProfile();
                  }}
                  className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-3 text-left text-sm font-medium shadow-sm transition-all hover:border-primary/30 hover:bg-card"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="text-xs font-bold">{initials}</span>
                  </span>
                  <span>
                    <span className="block">Profile</span>
                    <span className="text-[11px] text-muted-foreground">Account & security</span>
                  </span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain safe-x px-4 pb-4">
        {mainSection === "library" ? (
          <MainLibraryPanel
            uploads={uploads}
            generated={generated}
            loading={libraryLoading}
            isAuthenticated={isAuthenticated}
            onRefresh={refreshLibrary}
            onRequireAuth={onSignIn}
            onSelectUpload={(upload) => {
              const params = new URLSearchParams({
                sourceId: upload.id,
                sourceName: upload.title,
                sourceType: "uploaded-file",
              });
              router.push(`/c?${params.toString()}`);
            }}
            onSelectGenerated={(file) => {
              if (file.conversationId) {
                router.push(`/c?conversation=${encodeURIComponent(file.conversationId)}`);
                return;
              }
              router.push(routeForAgent(file.agentSlug));
            }}
            onDownloadUpload={
              isAuthenticated
                ? (upload) => void publicApi.downloadUpload(upload.id, upload.title)
                : undefined
            }
            onDeleteUpload={
              isAuthenticated
                ? async (upload) => {
                    await publicApi.deleteFile(upload.id);
                    await refreshLibrary();
                  }
                : undefined
            }
            onDownloadGenerated={
              isAuthenticated
                ? (file) => void publicApi.downloadGenerated(file.id, file.title)
                : undefined
            }
            onDeleteGenerated={
              isAuthenticated
                ? async (file) => {
                    await publicApi.deleteGenerated(file.id);
                    await refreshLibrary();
                  }
                : undefined
            }
          />
        ) : mainSection === "agents" ? (
          <MainAgentsPanel
            agents={agents}
            loading={agentsLoading}
            onSelect={openAgent}
          />
        ) : (
        <>
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
                  onClick={() => openAgent(agent.id)}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <AgentListingIcon
                    iconKey={agent.iconKey}
                    colorKey={agent.colorKey}
                    size="lg"
                  />
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
              onClick={onSignUp}
              className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm"
            >
              Create account
            </button>
          </section>
        )}
        </>
        )}
      </div>

      <div className="safe-bottom safe-x shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-md">
        <div className="border-b border-border/40 px-2 py-1">
          <SettingsHelpFooterTab showTopBorder={false} onOpen={openSupport} />
        </div>

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
