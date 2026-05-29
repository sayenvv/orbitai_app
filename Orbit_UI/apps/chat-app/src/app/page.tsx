"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Briefcase, Code, GraduationCap, Languages, Brain, History, LogOut, Settings, Star, Zap, X, Paperclip, Mic, Sparkles, MessageSquare, ArrowUp, Plane, Users, Globe2, ShieldCheck, Check, Search, FolderOpen, ChevronDown, Wand2, Palette } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { LoginModal } from "@/components/login-modal";
import { agents, quickPrompts, recentChats, routeForAgent } from "@/lib/home-data";
import { MobileHome } from "@/components/home/mobile-home";
import { useState, useRef } from "react";

const libraryItems = [
  { id: "l1", title: "Biology Ch.4 — Cell Division (Notes)", type: "Notes",      source: "Study Helper",     date: "Today" },
  { id: "l2", title: "Resume — Senior PM (v3)",            type: "Document",   source: "Job Search",       date: "Yesterday" },
  { id: "l3", title: "React useEffect deep-dive",          type: "Generated",  source: "Coding Tutor",     date: "2 days ago" },
  { id: "l4", title: "Spanish A2 flashcards",              type: "Flashcards", source: "Language Learning",date: "3 days ago" },
  { id: "l5", title: "Tokyo 7-day itinerary",              type: "Plan",       source: "Trip Adviser",     date: "Last week" },
  { id: "l6", title: "Algorithms cheat sheet (PDF)",       type: "Upload",     source: "My uploads",       date: "Last week" },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const handleLogout = useLogout();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setAttachedFiles((prev) => [...prev, ...files]);
    if (e.target) e.target.value = "";
  };
  const removeFile = (idx: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  const toggleLibraryItem = (id: string) =>
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const handleHeroSend = () => {
    if (
      !chatInput.trim() &&
      attachedFiles.length === 0 &&
      selectedLibraryIds.length === 0
    )
      return;
    router.push(`/c?prompt=${encodeURIComponent(chatInput)}`);
  };
  const filteredLibrary = libraryItems.filter((i) =>
    i.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
    i.source.toLowerCase().includes(librarySearch.toLowerCase())
  );

  // Mock subscription data - in real app, this would come from user data
  const userSubscription = (user?.subscription as { plan?: string } | undefined) ?? { plan: "free" };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";

  const handleSelectAgent = (agentId: string) => {
    router.push(routeForAgent(agentId));
  };

  const sidebarWidthClass = sidebarOpen ? "w-64" : "w-20";
  const sidebarLabelClass = sidebarOpen ? "pointer-events-auto opacity-100 max-w-[10rem]" : "pointer-events-none opacity-0 max-w-0";

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      priceHint: "forever",
      features: [
        "20 messages / day",
        "Access to 3 core agents",
        "Standard response speed",
        "Community support",
      ],
      cta: "Get started free",
    },
    {
      id: "starter",
      name: "Starter",
      price: "$9",
      priceHint: "/ month",
      features: [
        "100 messages / day",
        "All basic agents",
        "File uploads up to 10 MB",
        "Email support",
      ],
      cta: "Upgrade Now",
    },
    {
      id: "pro",
      name: "Pro",
      price: "$29",
      priceHint: "/ month",
      features: [
        "Unlimited messages",
        "All premium agents",
        "Custom agents & tools",
        "Priority support",
      ],
      cta: "Upgrade Now",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      priceHint: "contact sales",
      features: [
        "Everything in Pro",
        "API & SSO access",
        "Dedicated success manager",
        "99.99% uptime SLA",
      ],
      cta: "Contact Sales",
    },
  ];

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
          onProfile={() => setSettingsOpen(true)}
          onHistory={() => setSettingsOpen(true)}
        />
      </div>

      {/* Desktop — marketing + sidebar layout */}
      <main className="app-shell relative hidden w-full max-w-full flex-col overflow-hidden bg-background md:flex">
      {/* Main Content with Sidebar */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar rail */}
        <aside
          className={`hidden lg:flex ${sidebarWidthClass} flex-col border border-border/60 bg-card/90 px-2 py-4 shadow-[0_24px_54px_-20px_rgba(15,23,42,0.48),0_10px_22px_-12px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-[width,background-color,box-shadow] duration-300 ease-out will-change-[width]`}
          style={{ width: sidebarOpen ? 256 : 80 }}
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
                  className={`flex h-11 items-center rounded-2xl text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-foreground ${sidebarOpen ? "gap-3 px-3 justify-start" : "justify-center"}`}
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

          <div className="mt-auto flex flex-col gap-1.5 border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`flex h-11 items-center rounded-2xl text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-foreground ${sidebarOpen ? "gap-3 px-3 justify-start" : "justify-center"}`}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className={`truncate text-sm font-medium transition-all duration-300 ${sidebarLabelClass}`}>Settings</span>
            </button>
          </div>
        </aside>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`hidden lg:flex absolute top-4 z-40 items-center justify-center h-14 w-6 rounded-r-md border border-border/70 bg-card/98 text-foreground shadow-[0_18px_40px_-16px_rgba(15,23,42,0.55),0_8px_18px_-10px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-[left,opacity,transform,background-color] duration-300 ease-out hover:bg-card hover:text-foreground ${sidebarOpen ? "left-[16rem]" : "left-[5rem]"}`}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>

        {/* Main Content */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {/* Desktop top bar */}
              <header className="absolute right-6 top-4 z-20 flex items-center gap-1">
                {isAuthenticated && (
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-accent/80 transition-colors text-muted-foreground"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </button>
                )}
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
                <div className="relative max-w-3xl mx-auto">
                  {/* Selected chips */}
                  {(attachedFiles.length > 0 || selectedLibraryIds.length > 0) && (
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
                      {selectedLibraryIds.map((id) => {
                        const item = libraryItems.find((l) => l.id === id);
                        if (!item) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs shadow-mac"
                          >
                            <BookOpen className="h-3 w-3 text-primary" />
                            <span className="max-w-[200px] truncate">{item.title}</span>
                            <button
                              onClick={() => toggleLibraryItem(id)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
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
                          onClick={() => setLibraryOpen((o) => !o)}
                          className={`press inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-[13px] ${
                            selectedLibraryIds.length > 0 || libraryOpen
                              ? "bg-primary/15 text-primary"
                              : "bg-muted/60 dark:bg-muted/40 hover:bg-muted text-foreground/80 hover:text-foreground"
                          }`}
                          title="Use from your library"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          Library
                          {selectedLibraryIds.length > 0 && (
                            <span className="ml-0.5 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold leading-none">
                              {selectedLibraryIds.length}
                            </span>
                          )}
                        </button>

                        {libraryOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
                              onClick={() => setLibraryOpen(false)}
                            />
                            <div className="absolute left-0 top-full z-50 mt-2 w-[26rem] overflow-hidden rounded-2xl border glass-strong shadow-mac-lg">
                              <div className="px-3 py-2.5 border-b border-border/40 flex items-center gap-2">
                                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <input
                                  value={librarySearch}
                                  onChange={(e) => setLibrarySearch(e.target.value)}
                                  placeholder="Search uploads & generated content…"
                                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
                                />
                              </div>
                              <div className="max-h-72 overflow-auto p-1">
                                {filteredLibrary.length === 0 ? (
                                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                                    Nothing matches “{librarySearch}”
                                  </p>
                                ) : (
                                  filteredLibrary.map((item) => {
                                    const checked = selectedLibraryIds.includes(item.id);
                                    return (
                                      <button
                                        key={item.id}
                                        onClick={() => toggleLibraryItem(item.id)}
                                        className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent transition-colors ${
                                          checked ? "bg-primary/5" : ""
                                        }`}
                                      >
                                        <div
                                          className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                            checked
                                              ? "bg-primary border-primary"
                                              : "border-border"
                                          }`}
                                        >
                                          {checked && (
                                            <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                                          <p className="text-[11px] text-muted-foreground">{item.type} · {item.source} · {item.date}</p>
                                        </div>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                              <div className="border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
                                <span>{selectedLibraryIds.length} selected</span>
                                <div className="flex items-center gap-3">
                                  {selectedLibraryIds.length > 0 && (
                                    <button
                                      onClick={() => setSelectedLibraryIds([])}
                                      className="text-primary hover:underline"
                                    >
                                      Clear
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      fileInputRef.current?.click();
                                      setLibraryOpen(false);
                                    }}
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Paperclip className="h-3 w-3" /> Upload new
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
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
    </>
  );
}
