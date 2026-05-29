"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ArrowLeft,
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  MapPin,
  DollarSign,
  Clock,
  Star,
  ChevronRight,
  TrendingUp,
  Search,
  Compass,
  BookmarkPlus,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type JobSource = "LinkedIn" | "Indeed" | "Glassdoor" | "Wellfound" | "Naukri";

const sourceConfig: Record<JobSource, { color: string; dot: string }> = {
  LinkedIn: { color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10", dot: "bg-blue-500" },
  Indeed: { color: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10", dot: "bg-indigo-500" },
  Glassdoor: { color: "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10", dot: "bg-green-500" },
  Wellfound: { color: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10", dot: "bg-orange-500" },
  Naukri: { color: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10", dot: "bg-purple-500" },
};

interface JobCard {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  salary: string;
  postedAt: string;
  skills: string[];
  source: JobSource;
  rating: number;
  featured?: boolean;
}

const sampleJobs: JobCard[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "Vercel",
    logo: "▲",
    location: "Remote · US",
    salary: "$160k - $220k",
    postedAt: "2h ago",
    skills: ["React", "Next.js", "TypeScript"],
    source: "LinkedIn",
    rating: 4.8,
    featured: true,
  },
  {
    id: "2",
    title: "Frontend Engineer",
    company: "Figma",
    logo: "F",
    location: "Remote · US",
    salary: "$140k - $190k",
    postedAt: "1d ago",
    skills: ["React", "TypeScript", "WebGL"],
    source: "Indeed",
    rating: 4.9,
  },
  {
    id: "3",
    title: "Senior Frontend Engineer",
    company: "Shopify",
    logo: "S",
    location: "Remote · Canada",
    salary: "$150k - $200k",
    postedAt: "6h ago",
    skills: ["React", "GraphQL", "Tailwind"],
    source: "Glassdoor",
    rating: 4.7,
  },
];

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  jobs?: JobCard[];
  insights?: { label: string; value: string }[];
}

const quickPrompts = [
  { icon: Search, label: "Find remote React jobs above $150k" },
  { icon: TrendingUp, label: "Trending AI/ML roles this week" },
  { icon: Compass, label: "Help me explore frontend careers" },
  { icon: Sparkles, label: "Best paying jobs at top startups" },
];

export default function JobSearchChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Mock AI response with job cards
    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "agent",
        content: `I found ${sampleJobs.length} great matches for "${trimmed}" aggregated from multiple job boards. Here are the top picks:`,
        jobs: sampleJobs,
        insights: [
          { label: "Avg salary", value: "$170k" },
          { label: "Remote-friendly", value: "100%" },
          { label: "Sources", value: "3 boards" },
        ],
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);
    }, 900);
  };

  const exploreAll = () => {
    router.push("/job-search");
  };

  const isEmpty = messages.length === 0;

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold">Job Search Assistant</h1>
              <p className="text-[10px] text-muted-foreground">AI agent · powered by multi-board aggregation</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exploreAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Browse all jobs</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {isEmpty ? (
            <EmptyState onPrompt={sendMessage} />
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onExplore={exploreAll} />
            ))
          )}
          {isTyping && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-background/80 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end rounded-2xl border border-border/40 bg-card/60 px-3 py-2 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-sm">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mb-2" />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              rows={1}
              placeholder="Ask the Job Search agent anything..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 resize-none max-h-32 py-1.5 min-w-0"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:shadow-md hover:shadow-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">
            AI may show inaccurate info · always verify on the source job board
          </p>
        </div>
      </div>
    </main>
  );
}

/* ---------------- Components ---------------- */

function EmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <div className="py-8 space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
          <Briefcase className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-emerald-600 bg-clip-text text-transparent">
          Job Search Assistant
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tell me what kind of role you&apos;re looking for. I&apos;ll search across LinkedIn, Indeed, Glassdoor, Wellfound, and more.
        </p>
      </div>

      {/* Highlight chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { dot: "bg-blue-500", label: "LinkedIn" },
          { dot: "bg-indigo-500", label: "Indeed" },
          { dot: "bg-green-500", label: "Glassdoor" },
          { dot: "bg-orange-500", label: "Wellfound" },
          { dot: "bg-purple-500", label: "Naukri" },
        ].map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        ))}
      </div>

      {/* Quick prompts */}
      <div className="grid sm:grid-cols-2 gap-2 pt-2">
        {quickPrompts.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.label}
              onClick={() => onPrompt(p.label)}
              className="group text-left rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
            >
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-medium leading-snug pt-0.5">{p.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MessageBubble({ msg, onExplore }: { msg: ChatMessage; onExplore: () => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-muted" : "bg-gradient-to-br from-emerald-500 to-teal-600"
        }`}
      >
        {isUser ? <UserIcon className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-white" />}
      </div>

      <div className={`flex-1 max-w-[85%] space-y-3 ${isUser ? "flex flex-col items-end" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm"
              : "bg-muted/60 text-foreground rounded-tl-sm"
          }`}
        >
          {msg.content}
        </div>

        {/* Insight strip */}
        {msg.insights && (
          <div className="flex flex-wrap gap-2 w-full">
            {msg.insights.map((ins) => (
              <div
                key={ins.label}
                className="inline-flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 backdrop-blur-sm px-3 py-1.5"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{ins.label}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{ins.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Job cards */}
        {msg.jobs && msg.jobs.length > 0 && (
          <div className="space-y-2 w-full">
            {msg.jobs.map((job) => (
              <JobResultCard key={job.id} job={job} onView={onExplore} />
            ))}

            {/* Explore more CTA */}
            <button
              onClick={onExplore}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/60 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition-all"
            >
              <Compass className="h-4 w-4" />
              Explore all matching jobs
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function JobResultCard({ job, onView }: { job: JobCard; onView: () => void }) {
  const src = sourceConfig[job.source];
  return (
    <div className="group relative rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3 hover:border-emerald-500/40 hover:shadow-md transition-all">
      {job.featured && (
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-2 py-0.5">
          <Star className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 fill-current" />
          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Featured</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-11 w-11 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/20 flex items-center justify-center text-lg font-bold text-emerald-700 dark:text-emerald-400">
          {job.logo}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <h4 className="font-semibold text-sm leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {job.title}
            </h4>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs text-muted-foreground font-medium">{job.company}</p>
              <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-medium ${src.color}`}>
                <span className={`h-1 w-1 rounded-full ${src.dot}`} />
                {job.source}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {job.salary}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {job.postedAt}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-current" />
              {job.rating}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 pt-0.5">
            {job.skills.map((s) => (
              <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {s}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              onClick={onView}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View details
              <ExternalLink className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="ml-auto p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
              title="Save"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
