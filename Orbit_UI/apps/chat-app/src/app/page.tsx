"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Briefcase, Code, GraduationCap, Languages, Brain, History, LogOut, User, Settings, Star, Zap, Clock, X, Paperclip, Mic, Sparkles, MessageSquare, ArrowUp, Plane, Users, Globe2, ShieldCheck, Check, Search, FolderOpen, ChevronDown, Wand2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfilePanel } from "@/components/profile-panel";
import { LoginModal } from "@/components/login-modal";
import { useState, useRef } from "react";

const quickPrompts = [
  { label: "Explain a concept", prompt: "Explain this concept in simple terms:", icon: "💡" },
  { label: "Help me study", prompt: "Help me create a study plan for:", icon: "📚" },
  { label: "Write code", prompt: "Write code that:", icon: "💻" },
  { label: "Summarize text", prompt: "Summarize the following:", icon: "📝" },
  { label: "Practice interview", prompt: "Help me practice for a job interview in:", icon: "🎯" },
  { label: "Translate text", prompt: "Translate the following to:", icon: "🌐" },
];

const recentChats = [
  { id: "1", title: "React hooks explanation", agent: "Coding Tutor", time: "2 hours ago", preview: "Can you explain useEffect..." },
  { id: "2", title: "Resume review feedback", agent: "Job Search Assistant", time: "Yesterday", preview: "I need help improving my..." },
  { id: "3", title: "Spanish basics lesson", agent: "Language Learning", time: "2 days ago", preview: "How do I conjugate..." },
];

const libraryItems = [
  { id: "l1", title: "Biology Ch.4 — Cell Division (Notes)", type: "Notes",      source: "Study Helper",     date: "Today" },
  { id: "l2", title: "Resume — Senior PM (v3)",            type: "Document",   source: "Job Search",       date: "Yesterday" },
  { id: "l3", title: "React useEffect deep-dive",          type: "Generated",  source: "Coding Tutor",     date: "2 days ago" },
  { id: "l4", title: "Spanish A2 flashcards",              type: "Flashcards", source: "Language Learning",date: "3 days ago" },
  { id: "l5", title: "Tokyo 7-day itinerary",              type: "Plan",       source: "Trip Adviser",     date: "Last week" },
  { id: "l6", title: "Algorithms cheat sheet (PDF)",       type: "Upload",     source: "My uploads",       date: "Last week" },
];

const agents = [
  {
    id: "study-helper",
    name: "Study Helper",
    description: "Get help with study materials, notes, and exam preparation",
    icon: BookOpen,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "job-search",
    name: "Job Search Assistant",
    description: "Resume tips, interview prep, and job hunting strategies",
    icon: Briefcase,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    id: "coding-tutor",
    name: "Coding Tutor",
    description: "Learn programming concepts, debug code, and build projects",
    icon: Code,
    color: "from-purple-500 to-violet-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "career-guidance",
    name: "Career Guidance",
    description: "Explore career paths, skill development, and growth plans",
    icon: GraduationCap,
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    id: "language-learning",
    name: "Language Learning",
    description: "Practice languages, grammar help, and conversation practice",
    icon: Languages,
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
  },
  {
    id: "general-knowledge",
    name: "General Knowledge",
    description: "Ask anything — science, history, math, and more",
    icon: Brain,
    color: "from-cyan-500 to-sky-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  {
    id: "trip-adviser",
    name: "Trip Adviser",
    description: "Plan trips, find destinations, hotels, flights, and itineraries",
    icon: Plane,
    color: "from-orange-500 to-rose-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const handleLogout = useLogout();
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(true);
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
  const userSubscription = user?.subscription as any || { plan: "free" };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";

  const handleSelectAgent = (agentId: string) => {
    if (agentId === "job-search") {
      router.push("/job-search/chat");
      return;
    }
    if (agentId === "study-helper") {
      router.push("/study-helper/chat");
      return;
    }
    if (agentId === "trip-adviser") {
      router.push("/trip-adviser/chat");
      return;
    }
    router.push(`/c?agent=${agentId}`);
  };

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
    <main className="flex h-screen flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between h-14 px-4 border-b bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">AI Chat</h1>
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <button
              onClick={() => router.push("/history")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-muted-foreground"
              title="Chat History"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </button>
          )}
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="relative ml-1 group">
              <button
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
                title="Profile"
              >
                <div className="relative">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-border/60">
                    <span className="text-[10px] font-bold text-primary">{initials}</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>
                <span className="text-xs font-medium hidden lg:block">{displayName}</span>
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-card shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => setProfileOpen(true)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4" /> Profile
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors">
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-2">
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
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex gap-0 overflow-hidden relative">
        {/* Sidebar — only for authenticated users */}
        {isAuthenticated && (
        <aside
          className={`hidden lg:flex flex-col bg-background border-r transition-all duration-300 ease-in-out overflow-hidden relative ${
            sidebarOpen ? "w-60 px-3 py-4" : "w-0 px-0 py-0"
          }`}
        >
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:none] flex flex-col">
            {isAuthenticated ? (
              <>
                {/* Premium Upgrade Card for logged-in users - Hidden when history is expanded */}
                {!chatHistoryOpen && (
                  <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-3 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        <h3 className="font-semibold text-xs">Upgrade to Premium</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {userSubscription?.plan === "free"
                          ? "Unlock unlimited messages and all AI agents"
                          : "You have an active premium subscription"}
                      </p>
                    </div>

                    {userSubscription?.plan === "free" && (
                      <>
                        <ul className="space-y-1.5 text-xs">
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Zap className="h-3 w-3 text-primary" />
                            <span>Unlimited messages</span>
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Star className="h-3 w-3 text-primary" />
                            <span>All premium agents</span>
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>Priority support</span>
                          </li>
                        </ul>
                        <button className="w-full bg-primary text-primary-foreground px-2 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors">
                          Upgrade Now
                        </button>
                      </>
                    )}

                    {userSubscription?.plan !== "free" && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2">
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          ✓ Premium Active
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat History Section - Collapsible - VS Code Style */}
                <div className={`space-y-2 border-t border-border/20 pt-3 transition-all duration-300 flex flex-col ${chatHistoryOpen ? "flex-1" : ""} ${!chatHistoryOpen ? "mt-auto" : ""}`}>
                  <button
                    onClick={() => setChatHistoryOpen(!chatHistoryOpen)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent/50 rounded transition-colors group"
                  >
                    <svg
                      className={`h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 transition-transform duration-200 ${
                        chatHistoryOpen ? "" : "-rotate-90"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                    <h2 className="font-semibold text-xs uppercase tracking-wider text-foreground">Chat History</h2>
                  </button>
                  
                  {/* Collapsible Content */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out flex flex-col ${
                      chatHistoryOpen ? "flex-1 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:none]">
                      {recentChats.map((chat, idx) => (
                        <button
                          key={chat.id}
                          onClick={() => router.push(`/c/${chat.id}`)}
                          className="group w-full text-left relative flex flex-col gap-1 rounded-lg border border-border/30 bg-card/40 backdrop-blur-sm p-2.5 hover:border-primary/50 hover:bg-card/60 transition-all duration-200"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
                          <div className="relative">
                            <h3 className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors">{chat.title}</h3>
                            <p className="text-xs text-primary/60 font-medium">{chat.agent}</p>
                          </div>
                          <p className="relative text-xs text-muted-foreground line-clamp-1 group-hover:text-foreground/70 transition-colors">{chat.preview}</p>
                          <p className="relative text-xs text-muted-foreground/50">{chat.time}</p>
                        </button>
                      ))}
                    </div>
                    <button className="w-full mt-2 text-xs font-medium text-primary hover:text-primary/80 py-1.5 rounded-lg border border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all duration-200">
                      View All History
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Bottom User Info */}
          <div className="mt-4 pt-3 border-t">
            <div className="rounded-lg bg-muted/50 p-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-border/60">
                  <span className="text-[10px] font-bold text-primary">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {userSubscription?.plan === "free" ? "Free" : "Premium"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
        )}

        {/* Sidebar Toggle Button — only when sidebar is rendered */}
        {isAuthenticated && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 z-50 items-center justify-center w-4 h-10 bg-muted/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300 ease-in-out border border-l-0 border-border/50 hover:border-border rounded-r-sm opacity-0 hover:opacity-100 focus:opacity-100 group ${sidebarOpen ? "left-[15rem] opacity-60" : "left-0 opacity-60"}`}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <svg className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-px" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-px" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            {/* Scrollable Content */}
            <div className="aurora flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-8 bg-gradient-to-br from-background via-background to-primary/5">
              <div className="absolute inset-0 grid-dots pointer-events-none -z-10" />
              <div className="relative w-full max-w-4xl mx-auto space-y-8">
                {/* Premium Header */}
                <div className="text-center space-y-3">
                  <div className="float-slow inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 backdrop-blur-sm">
                    <span className="dot-live" />
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">AI Assistants · Live</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-bold text-gradient tracking-tight leading-[1.1]">What can I help you with?</h1>
                  <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">Choose a specialized AI assistant or ask anything directly.</p>
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

                  <div className="space-y-2.5">
                    {/* iOS-style inset search pill */}
                    <div className="group relative flex items-center gap-2 h-12 px-4 rounded-full bg-muted/70 dark:bg-muted/50 border border-border/40 backdrop-blur-xl transition-all focus-within:bg-card focus-within:border-primary/40 focus-within:shadow-mac focus-within:ring-4 focus-within:ring-primary/15">
                      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleHeroSend();
                          }
                        }}
                        placeholder="Search, ask anything, or paste a topic…"
                        className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground/70"
                      />
                      {chatInput && (
                        <button
                          onClick={() => setChatInput("")}
                          className="press inline-flex items-center justify-center h-5 w-5 rounded-full bg-foreground/25 hover:bg-foreground/40 text-background transition-colors shrink-0"
                          title="Clear"
                          aria-label="Clear"
                        >
                          <X className="h-3 w-3" strokeWidth={3} />
                        </button>
                      )}
                      <div className="h-5 w-px bg-border/60 mx-0.5" />
                      <button
                        onClick={() => setIsRecording((r) => !r)}
                        className={`press inline-flex items-center justify-center h-7 w-7 rounded-full transition-colors shrink-0 ${
                          isRecording
                            ? "bg-destructive/15 text-destructive"
                            : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                        }`}
                        title="Voice input"
                        aria-label="Voice input"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    </div>

                    {/* iOS segmented action row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="press inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-muted/60 dark:bg-muted/40 hover:bg-muted text-foreground/80 hover:text-foreground text-[13px] font-medium transition-colors"
                          title="Upload files"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-primary" />
                          Upload
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setLibraryOpen((o) => !o)}
                            className={`press inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium transition-colors ${
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
                                className="fixed inset-0 z-40"
                                onClick={() => setLibraryOpen(false)}
                              />
                              <div className="absolute left-0 top-full mt-2 w-[22rem] sm:w-[26rem] glass-strong shadow-mac-lg rounded-2xl border z-50 overflow-hidden">
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
                                            <p className="text-sm font-medium line-clamp-1">
                                              {item.title}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                              {item.type} · {item.source} · {item.date}
                                            </p>
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

                      {/* iOS circular send button */}
                      <button
                        onClick={handleHeroSend}
                        disabled={
                          !chatInput.trim() &&
                          attachedFiles.length === 0 &&
                          selectedLibraryIds.length === 0
                        }
                        className="press inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all shadow-mac"
                        title="Send"
                        aria-label="Send"
                      >
                        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    Drop files, paste links, or reuse anything you&apos;ve generated before · <kbd className="px-1.5 py-0.5 rounded-md border bg-card/60 text-[10px] font-mono">return</kbd> to send
                  </p>
                </div>

                {/* Trust strip — only for guests */}
                {!isAuthenticated && (
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> SOC 2 Type II</span>
                    <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-primary" /> GDPR compliant</span>
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> 120K+ users</span>
                    <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500" /> 4.9 rating</span>
                    <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> &lt; 300ms response</span>
                  </div>
                )}

                {/* Recent Chats */}
                {isAuthenticated && recentChats.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Conversations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {recentChats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => router.push(`/c/${chat.id}`)}
                          className="group flex flex-col items-start gap-2 rounded-xl border border-border/40 bg-card/50 p-4 hover:border-primary/40 hover:bg-card/80 transition-all text-left"
                        >
                          <div className="flex-1 min-w-0 w-full">
                            <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{chat.title}</h3>
                            <p className="text-[11px] text-primary/60 font-medium">{chat.agent}</p>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{chat.preview}</p>
                          <p className="text-[11px] text-muted-foreground/50">{chat.time}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Start</h2>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickPrompts.map((quickPrompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setChatInput(quickPrompt.prompt)}
                        className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-4 py-2 text-sm hover:border-primary/40 hover:bg-card/80 transition-all"
                        title={quickPrompt.label}
                      >
                        <span>{quickPrompt.icon}</span>
                        <span className="text-xs font-medium">{quickPrompt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Assistants */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Assistants</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => {
                      const Icon = agent.icon;
                      return (
                        <div
                          key={agent.id}
                          className={`group relative flex items-start gap-4 rounded-xl border border-border/40 p-4 text-left hover:border-primary/40 hover:shadow-md transition-all cursor-default ${agent.bgColor}`}
                        >
                          <div className={`shrink-0 inline-flex items-center justify-center rounded-lg p-2.5 bg-gradient-to-br ${agent.color} text-white shadow-sm group-hover:scale-105 transition-transform`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{agent.name}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{agent.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* How It Works — only for guests */}
                {!isAuthenticated && (
                  <div className="space-y-4">
                    <h2 className="text-center text-lg font-bold tracking-tight">How it works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { step: "1", title: "Choose an Assistant", description: "Pick a specialized AI agent for your task.", icon: Wand2, color: "from-violet-500 to-purple-600" },
                        { step: "2", title: "Ask Your Question", description: "Type naturally or upload files for context.", icon: MessageSquare, color: "from-blue-500 to-indigo-600" },
                        { step: "3", title: "Get Expert Answers", description: "Receive detailed, actionable responses instantly.", icon: Sparkles, color: "from-emerald-500 to-teal-600" },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.step} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/50 p-4">
                            <div className={`shrink-0 inline-flex items-center justify-center rounded-lg p-2 bg-gradient-to-br ${item.color} text-white text-xs font-bold`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm">{item.title}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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

                {/* Testimonials — only for guests */}
                {!isAuthenticated && (
                  <div className="space-y-4">
                    <h2 className="text-center text-lg font-bold tracking-tight">What users say</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { quote: "The Study Helper completely changed how I prepare for exams. Went from C's to A's in one semester.", name: "Sarah M.", role: "CS Student" },
                        { quote: "I landed my dream job using the Job Search Assistant. The interview prep was incredibly realistic.", name: "James K.", role: "Software Engineer" },
                        { quote: "The Language Learning agent helped me pass my IELTS with a band 8. Highly recommend!", name: "Priya D.", role: "Graduate Student" },
                      ].map((testimonial, idx) => (
                        <div key={idx} className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <p className="text-xs text-foreground/90 leading-relaxed italic">&ldquo;{testimonial.quote}&rdquo;</p>
                          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-primary">{testimonial.name.split(" ").map(n => n[0]).join("")}</span>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium">{testimonial.name}</p>
                              <p className="text-[10px] text-muted-foreground">{testimonial.role}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ — only for guests */}
                {!isAuthenticated && (
                  <div className="space-y-4">
                    <h2 className="text-center text-lg font-bold tracking-tight">FAQ</h2>
                    <div className="max-w-2xl mx-auto space-y-2">
                      {[
                        { q: "Is there a free plan?", a: "Yes! 20 messages/day with 3 core agents. No credit card needed." },
                        { q: "Can I upload documents?", a: "Yes — PDFs, images, code files, and more. The AI analyzes them in context." },
                        { q: "Is my data secure?", a: "SOC 2 Type II certified, GDPR compliant, encrypted at rest and in transit." },
                        { q: "Can I cancel anytime?", a: "Yes, cancel anytime. 14-day money-back guarantee on all paid plans." },
                      ].map((faq, idx) => (
                        <details key={idx} className="group rounded-lg border border-border/40 bg-card/50 overflow-hidden">
                          <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none hover:bg-accent/30 transition-colors">
                            <span className="text-sm font-medium">{faq.q}</span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
                            {faq.a}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing — only for guests */}
                {!isAuthenticated && (
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <h2 className="text-lg font-bold tracking-tight">Simple pricing</h2>
                      <p className="text-xs text-muted-foreground">Start free. Upgrade anytime. No hidden fees.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          className={`relative rounded-xl border p-5 flex flex-col gap-4 ${
                            plan.popular
                              ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                              : "border-border/40 bg-card/50"
                          }`}
                        >
                          {plan.popular && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-semibold">
                              Popular
                            </span>
                          )}
                          <div>
                            <h3 className="text-sm font-semibold">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-2xl font-bold">{plan.price}</span>
                              {plan.priceHint && <span className="text-[11px] text-muted-foreground">{plan.priceHint}</span>}
                            </div>
                          </div>
                          <ul className="space-y-1.5 text-xs flex-1">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                                <Check className="h-3 w-3 text-primary shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => { setAuthMode("register"); setLoginModalOpen(true); }}
                            className={`w-full rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                              plan.popular
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "border border-border hover:bg-accent"
                            }`}
                          >
                            {plan.cta}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Profile Panel */}
      {isAuthenticated && (
        <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
      )}

      {/* Login Modal */}
      {!isAuthenticated && (
        <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} defaultMode={authMode} />
      )}
    </main>
  );
}
