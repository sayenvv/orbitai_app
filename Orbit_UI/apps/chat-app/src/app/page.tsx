"use client";

import { useRouter } from "next/navigation";
import { BookOpen, LogOut, X, Paperclip, Sparkles, MessageSquare, Search, FolderOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { LoginModal } from "@/components/login-modal";
import { libraryItems, routeForAgent } from "@/lib/home-data";
import { useAgents } from "@/hooks/use-agents";
import { MobileHome } from "@/components/home/mobile-home";
import { LibraryPicker } from "@/components/home/library-picker";
import { SupportModal, SettingsHelpFooterTab, type SupportTab } from "@/components/home/support-modal";
import { useState, useRef } from "react";

export default function HomePage() {
  const { agents } = useAgents();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const handleLogout = useLogout();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportTab, setSupportTab] = useState<SupportTab>("settings");
  const openSupport = (tab: SupportTab = "settings") => {
    setSupportTab(tab);
    setSupportOpen(true);
  };
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryButtonRef = useRef<HTMLButtonElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setAttachedFiles((prev) => [...prev, ...files]);
    if (e.target) e.target.value = "";
  };
  const removeFile = (idx: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  const selectLibraryItem = (id: string) => setSelectedLibraryId(id);
  const handleHeroSend = () => {
    if (
      !chatInput.trim() &&
      attachedFiles.length === 0 &&
      !selectedLibraryId
    )
      return;
    router.push(`/c?prompt=${encodeURIComponent(chatInput)}`);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const displayName = user?.name || "User";

  const handleSelectAgent = (agentId: string) => {
    router.push(routeForAgent(agentId));
  };

  const sidebarWidthClass = sidebarOpen ? "w-64" : "w-20";
  const sidebarLabelClass = sidebarOpen ? "pointer-events-auto opacity-100 max-w-[10rem]" : "pointer-events-none opacity-0 max-w-0";
  const selectedLibraryItem = selectedLibraryId
    ? libraryItems.find((item) => item.id === selectedLibraryId)
    : null;

  return (
    <>
      {/* Mobile — dedicated app-style UI */}
      <div className="md:hidden">
        <MobileHome
          isAuthenticated={isAuthenticated}
          displayName={displayName}
          initials={initials}
          onSignIn={() => { setAuthMode("login"); setLoginModalOpen(true); }}
          onSignUp={() => { setAuthMode("register"); setLoginModalOpen(true); }}
          onProfile={() => openSupport("settings")}
          onHistory={() => router.push("/history")}
          onOpenSupport={() => openSupport("settings")}
        />
      </div>

      {/* Desktop — marketing + sidebar layout */}
      <main className="app-shell relative hidden w-full max-w-full flex-col overflow-hidden bg-background md:flex">
      {/* Main Content with Sidebar */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar rail */}
        <aside
          className={`hidden lg:flex ${sidebarWidthClass} flex-col border-r border-sidebar-border bg-sidebar px-2 py-4 transition-[width,background-color] duration-300 ease-out will-change-[width]`}
        >
          <div className="mb-6 flex items-center justify-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform hover:-translate-y-0.5"
              aria-label="Go home"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1.5">
            {[
              { label: "Home", icon: MessageSquare, action: () => router.push("/") },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={`flex h-11 items-center rounded-2xl text-sidebar-foreground/70 transition-all duration-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${sidebarOpen ? "gap-3 px-3 justify-start" : "justify-center"}`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={`truncate text-sm font-medium transition-all duration-300 ${sidebarLabelClass}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <SettingsHelpFooterTab
            collapsed={!sidebarOpen}
            onOpen={() => openSupport("settings")}
          />
        </aside>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`hidden lg:flex absolute top-4 z-40 items-center justify-center h-14 w-6 rounded-r-md border border-l-0 border-sidebar-border bg-sidebar text-sidebar-foreground transition-[left,color,background-color] duration-300 ease-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${sidebarOpen ? "left-[16rem]" : "left-[5rem]"}`}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" strokeWidth={2.25} />
          ) : (
            <PanelLeftOpen className="h-5 w-5" strokeWidth={2.25} />
          )}
        </button>

        {/* Main Content */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {/* Desktop top bar */}
              <header className="absolute right-6 top-4 z-20 flex items-center gap-1">
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/80 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                ) : (
                  <div className="ml-2 flex items-center gap-3">
                    <button
                      onClick={() => { setAuthMode("login"); setLoginModalOpen(true); }}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-accent transition-all duration-200"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { setAuthMode("register"); setLoginModalOpen(true); }}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </header>
            {/* Scrollable Content */}
            <div aria-hidden className="aurora" />
            <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-6 py-8 bg-background">
              <div className="relative mx-auto w-full max-w-7xl space-y-6 px-2 sm:px-4 lg:px-6">
                {/* Hero */}
                <div className="space-y-3 pt-14 text-center">
                  <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-gradient">
                    What can I help you with?
                  </h1>
                  <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
                    Choose a specialized AI assistant or ask anything directly.
                  </p>
                </div>

                {/* Hero search / prompt bar with upload + library */}
                <div className="relative mx-auto max-w-3xl">
                  {/* Selected chips */}
                  {(attachedFiles.length > 0 || selectedLibraryId) && (
                    <div className="mb-3 flex flex-wrap gap-2 justify-center">
                      {attachedFiles.map((file, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 backdrop-blur px-3 py-1 text-xs shadow-mac"
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
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <div className="group relative flex h-12 w-full items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-3 transition-all duration-300 hover:border-primary/30 hover:bg-card/95 focus-within:border-primary/60 focus-within:bg-card focus-within:shadow-[0_18px_40px_-18px_rgba(59,130,246,0.45)] focus-within:ring-4 focus-within:ring-primary/12 sm:h-14 sm:rounded-[28px] sm:px-4">
                      <Search className="h-4 w-4 text-muted-foreground/90 shrink-0 transition-colors group-focus-within:text-primary sm:h-4.5 sm:w-4.5" />
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleHeroSend();
                          }
                        }}
                        placeholder="Ask anything…"
                        className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-base"
                      />
                      {chatInput && (
                        <button
                          onClick={() => setChatInput("")}
                          className="press inline-flex items-center justify-center h-6 w-6 rounded-full bg-foreground/10 text-foreground/80 transition-colors hover:bg-foreground/15 hover:text-foreground shrink-0"
                          title="Clear"
                          aria-label="Clear"
                        >
                          <X className="h-3 w-3" strokeWidth={3} />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground dark:bg-muted/40 sm:gap-1.5 sm:px-3 sm:text-[13px]"
                        title="Upload files"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-primary" />
                        <span>Upload</span>
                      </button>

                      <div className="relative min-w-0">
                        <button
                          ref={libraryButtonRef}
                          onClick={() => setLibraryOpen((o) => !o)}
                          className={`press inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-[13px] ${
                            selectedLibraryId || libraryOpen
                              ? "bg-primary/15 text-primary"
                              : "bg-muted/60 dark:bg-muted/40 hover:bg-muted text-foreground/80 hover:text-foreground"
                          }`}
                          title="Use from your library"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          Library
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 hidden text-center text-[11px] text-muted-foreground sm:mt-3 sm:block">
                    Drop files, paste links, or reuse anything you&apos;ve generated before · <kbd className="rounded-md border bg-card/60 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to send
                  </p>
                </div>

                {/* AI Assistants */}
                <div className="space-y-2 sm:space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Assistants</h2>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                    {agents.map((agent) => {
                      const Icon = agent.icon;
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => handleSelectAgent(agent.id)}
                          className={`group relative flex w-full items-start gap-3 rounded-xl border border-border/40 p-3 text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99] sm:gap-4 sm:p-4 ${agent.bgColor}`}
                        >
                          <div className={`shrink-0 inline-flex items-center justify-center rounded-lg p-2.5 bg-gradient-to-br ${agent.color} text-white shadow-sm group-hover:scale-105 transition-transform`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{agent.name}</h3>
                            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{agent.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* What's New — only for authenticated users */}
                {isAuthenticated && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What&apos;s New</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { title: "Trip Adviser Agent", description: "Plan vacations with AI-powered itineraries and hotel picks.", tag: "New", tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                        { title: "File Upload Support", description: "Upload PDFs and documents for instant AI analysis.", tag: "Feature", tagColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                        { title: "40% Faster Responses", description: "Near-instant responses across all agents.", tag: "Speed", tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                      ].map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.tagColor}`}>
                            {item.tag}
                          </span>
                          <h3 className="font-semibold text-sm">{item.title}</h3>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
        </div>
      </div>
      </main>

      {/* Login Modal */}
      {!isAuthenticated && (
        <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} defaultMode={authMode} />
      )}

      <LibraryPicker
        open={libraryOpen}
        anchorRef={libraryButtonRef}
        items={libraryItems}
        search={librarySearch}
        onSearchChange={setLibrarySearch}
        selectedId={selectedLibraryId}
        onSelectItem={selectLibraryItem}
        onClearSelection={() => setSelectedLibraryId(null)}
        onClose={() => setLibraryOpen(false)}
        onUploadNew={() => {
          fileInputRef.current?.click();
          setLibraryOpen(false);
        }}
      />

      <SupportModal
        open={supportOpen}
        tab={supportTab}
        onClose={() => setSupportOpen(false)}
        onTabChange={setSupportTab}
        isAuthenticated={isAuthenticated}
        onSignOut={handleLogout}
      />
    </>
  );
}
