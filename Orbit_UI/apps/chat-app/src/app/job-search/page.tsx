"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  BookmarkPlus,
  Bookmark,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Users,
  Star,
  ExternalLink,
  ChevronRight,
  BarChart3,
  CheckCircle2,
  Target,
  Layers,
  MessageSquare,
  Send,
  Bot,
  User as UserIcon,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type JobSource =
  | "LinkedIn"
  | "Indeed"
  | "Glassdoor"
  | "Wellfound"
  | "Naukri"
  | "Welcome to the Jungle";

const sourceConfig: Record<JobSource, { color: string; dot: string; short: string }> = {
  LinkedIn: { color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10", dot: "bg-blue-500", short: "in" },
  Indeed: { color: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10", dot: "bg-indigo-500", short: "id" },
  Glassdoor: { color: "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10", dot: "bg-green-500", short: "gd" },
  Wellfound: { color: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10", dot: "bg-orange-500", short: "wf" },
  Naukri: { color: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10", dot: "bg-purple-500", short: "nk" },
  "Welcome to the Jungle": { color: "text-pink-600 dark:text-pink-400 border-pink-500/30 bg-pink-500/10", dot: "bg-pink-500", short: "wj" },
};

interface JobListing {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Remote";
  salary: string;
  postedAt: string;
  description: string;
  skills: string[];
  applicants: number;
  rating: number;
  featured?: boolean;
  source: JobSource;
}

const mockJobs: JobListing[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "Vercel",
    logo: "▲",
    location: "Remote · San Francisco",
    type: "Full-time",
    salary: "$160k - $220k",
    postedAt: "2 hours ago",
    description: "Build the future of web development with our next-gen platform. Work with React, Next.js, and TypeScript.",
    skills: ["React", "Next.js", "TypeScript", "Tailwind"],
    applicants: 42,
    rating: 4.8,
    featured: true,
    source: "LinkedIn",
  },
  {
    id: "2",
    title: "AI/ML Engineer",
    company: "OpenAI",
    logo: "○",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$200k - $350k",
    postedAt: "5 hours ago",
    description: "Join us in advancing artificial general intelligence. Work on large language models and cutting-edge AI research.",
    skills: ["Python", "PyTorch", "ML", "Research"],
    applicants: 128,
    rating: 4.9,
    featured: true,
    source: "Wellfound",
  },
  {
    id: "3",
    title: "Full Stack Developer",
    company: "Stripe",
    logo: "S",
    location: "Remote",
    type: "Remote",
    salary: "$140k - $190k",
    postedAt: "1 day ago",
    description: "Help build the economic infrastructure for the internet. Work on payment systems used by millions.",
    skills: ["Ruby", "React", "PostgreSQL", "AWS"],
    applicants: 89,
    rating: 4.7,
    source: "Indeed",
  },
  {
    id: "4",
    title: "Product Designer",
    company: "Linear",
    logo: "L",
    location: "Remote · Europe",
    type: "Full-time",
    salary: "$120k - $170k",
    postedAt: "2 days ago",
    description: "Design beautiful, fast, and intuitive software for modern product teams. Help shape the future of project management.",
    skills: ["Figma", "Design Systems", "Prototyping", "UX"],
    applicants: 56,
    rating: 4.8,
    source: "Welcome to the Jungle",
  },
  {
    id: "5",
    title: "DevOps Engineer",
    company: "GitHub",
    logo: "G",
    location: "Remote · Worldwide",
    type: "Full-time",
    salary: "$150k - $200k",
    postedAt: "3 days ago",
    description: "Build and scale the infrastructure that powers the world's largest developer platform.",
    skills: ["Kubernetes", "Terraform", "AWS", "CI/CD"],
    applicants: 73,
    rating: 4.6,
    source: "Glassdoor",
  },
  {
    id: "6",
    title: "Mobile Engineer (iOS)",
    company: "Notion",
    logo: "N",
    location: "San Francisco · Remote",
    type: "Full-time",
    salary: "$155k - $210k",
    postedAt: "4 days ago",
    description: "Build the next generation of Notion's mobile experience. Work on a product loved by millions.",
    skills: ["Swift", "SwiftUI", "iOS", "Mobile"],
    applicants: 64,
    rating: 4.7,
    source: "Naukri",
  },
  {
    id: "7",
    title: "Senior Frontend Engineer",
    company: "Shopify",
    logo: "S",
    location: "Remote · Canada",
    type: "Remote",
    salary: "$150k - $200k",
    postedAt: "6 hours ago",
    description: "Build merchant-facing experiences at massive scale using React and TypeScript.",
    skills: ["React", "TypeScript", "GraphQL", "Tailwind"],
    applicants: 91,
    rating: 4.7,
    source: "Indeed",
  },
  {
    id: "8",
    title: "Frontend Engineer",
    company: "Figma",
    logo: "F",
    location: "Remote · US",
    type: "Full-time",
    salary: "$140k - $190k",
    postedAt: "1 day ago",
    description: "Help us craft the world's best collaborative design tool used by millions.",
    skills: ["React", "TypeScript", "WebGL", "Next.js"],
    applicants: 112,
    rating: 4.9,
    source: "LinkedIn",
  },
  {
    id: "9",
    title: "AI Research Engineer",
    company: "Anthropic",
    logo: "A",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$220k - $380k",
    postedAt: "8 hours ago",
    description: "Conduct frontier research on safe and steerable large language models.",
    skills: ["Python", "PyTorch", "ML", "Transformers"],
    applicants: 204,
    rating: 4.9,
    source: "Wellfound",
  },
  {
    id: "10",
    title: "Machine Learning Engineer",
    company: "Hugging Face",
    logo: "H",
    location: "Remote · Worldwide",
    type: "Remote",
    salary: "$160k - $240k",
    postedAt: "12 hours ago",
    description: "Build open-source ML tools and infrastructure for the global AI community.",
    skills: ["Python", "PyTorch", "Transformers", "ML"],
    applicants: 156,
    rating: 4.8,
    source: "Glassdoor",
  },
];

const filterCategories = [
  { label: "All Jobs", value: "all", count: 1247 },
  { label: "Remote", value: "remote", count: 482 },
  { label: "Full-time", value: "full-time", count: 891 },
  { label: "Contract", value: "contract", count: 156 },
  { label: "Featured", value: "featured", count: 24 },
];

export default function JobSearchPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(mockJobs[0]);

  // Chat state - lets the candidate talk to the AI job-search agent
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "agent"; content: string }[]>([
    {
      role: "agent",
      content: "Hi! I'm your AI job search assistant. Ask me anything — like 'find me remote React roles above $150k' or 'what skills should I learn for ML engineering?'",
    },
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatOpen(true);
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "agent",
        content: `I found ${mockJobs.length} matching opportunities aggregated from multiple boards. Let me highlight the top ones for "${text}"…`,
      },
    ]);
    setChatInput("");
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const toggleSaveJob = (jobId: string) => {
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const filteredJobs = mockJobs.filter((job) => {
    if (activeFilter === "featured") return job.featured;
    if (activeFilter === "remote") return job.type === "Remote" || job.location.toLowerCase().includes("remote");
    if (activeFilter === "full-time") return job.type === "Full-time";
    if (activeFilter === "contract") return job.type === "Contract";
    return true;
  });

  // Aggregate skills across similar-role listings so the candidate can see which skills are in demand for THIS role.
  // Similarity = any meaningful token shared in the job title (e.g. "Frontend", "Engineer", "ML").
  const roleSkillStats = useMemo(() => {
    if (!selectedJob) return { skills: [] as { skill: string; count: number; percent: number; required: boolean }[], sampleSize: 0 };
    const STOP = new Set(["the", "and", "for", "with", "of", "a", "an", "to", "in", "on", "senior", "junior", "lead", "staff", "i", "ii", "iii"]);
    const tokens = selectedJob.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP.has(t));
    const similar = mockJobs.filter((j) =>
      tokens.some((t) => j.title.toLowerCase().includes(t))
    );
    const counts = new Map<string, number>();
    similar.forEach((j) => j.skills.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
    const total = similar.length || 1;
    const requiredSet = new Set(selectedJob.skills);
    const skills = Array.from(counts.entries())
      .map(([skill, count]) => ({
        skill,
        count,
        percent: Math.round((count / total) * 100),
        required: requiredSet.has(skill),
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 8);
    return { skills, sampleSize: similar.length };
  }, [selectedJob]);

  return (
    <main className="flex h-screen flex-col bg-background">
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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-sm font-semibold">Job Search</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-muted-foreground">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Saved ({savedJobs.size})</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero / Search Section - Compact */}
      <div className="border-b bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 px-6 py-4 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Title block */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight bg-gradient-to-r from-foreground to-emerald-600 bg-clip-text text-transparent">
                Find your dream job
              </h2>
              <p className="text-[11px] text-muted-foreground leading-tight">AI-powered matching · 1,247 active roles</p>
            </div>
          </div>

          {/* Chat with AI Agent (replaces search bar) */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 items-center rounded-lg border border-border/40 bg-card/60 backdrop-blur-md px-3 py-2 shadow-sm focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="p-1 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hidden sm:inline">Ask AI</span>
              </div>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                onFocus={() => setChatOpen(true)}
                placeholder="e.g. Find me remote React jobs above $150k..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 min-w-0"
              />
              <button
                onClick={() => setChatOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                title="Open chat"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </button>
              <button
                onClick={sendChat}
                disabled={!chatInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 text-xs font-semibold hover:shadow-md hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3 w-3" />
                Send
              </button>
            </div>
          </div>

          {/* Inline Stats */}
          <div className="hidden xl:flex items-center gap-4 shrink-0 pl-2 border-l border-border/40">
            {[
              { icon: Briefcase, label: "Jobs", value: "1.2k" },
              { icon: Building2, label: "Cos", value: "324" },
              { icon: TrendingUp, label: "New", value: "+89" },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <div className="leading-none">
                    <p className="text-sm font-bold">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="border-b px-6 py-3 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0 [scrollbar-width:none]">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          {filterCategories.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeFilter === filter.value
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                  : "border border-border/40 bg-card/40 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {filter.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === filter.value ? "bg-white/20" : "bg-muted-foreground/10"}`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 overflow-hidden flex">
        {/* Job List */}
        <div className="w-full lg:w-2/5 border-r overflow-y-auto [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]">
          <div className="p-4 space-y-3">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No jobs found matching your criteria
              </div>
            ) : (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`group w-full text-left relative rounded-xl border p-4 transition-all duration-300 overflow-hidden ${
                    selectedJob?.id === job.id
                      ? "border-emerald-500/50 bg-emerald-500/5 shadow-md"
                      : "border-border/30 bg-card/40 backdrop-blur-sm hover:border-emerald-500/30 hover:bg-card/60 hover:shadow-md"
                  }`}
                >
                  {job.featured && (
                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-2 py-0.5">
                      <Star className="h-3 w-3 text-amber-600 dark:text-amber-400 fill-current" />
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Featured</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/20 flex items-center justify-center text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {job.logo}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground font-medium">{job.company}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[10px] font-medium ${sourceConfig[job.source].color}`}>
                            <span className={`h-1 w-1 rounded-full ${sourceConfig[job.source].dot}`} />
                            {job.source}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {job.salary}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {job.postedAt}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveJob(job.id);
                          }}
                          className="p-1 rounded hover:bg-accent transition-colors"
                        >
                          {savedJobs.has(job.id) ? (
                            <Bookmark className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 fill-current" />
                          ) : (
                            <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Job Detail */}
        <div className="hidden lg:flex flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]">
          {selectedJob ? (
            <div className="w-full p-8 space-y-6">
              {/* Job Header */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedJob.logo}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">{selectedJob.title}</h2>
                        <p className="text-base text-muted-foreground font-medium">{selectedJob.company}</p>
                      </div>
                      <button
                        onClick={() => toggleSaveJob(selectedJob.id)}
                        className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        {savedJobs.has(selectedJob.id) ? (
                          <Bookmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-current" />
                        ) : (
                          <BookmarkPlus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-current" />
                      <span className="font-semibold">{selectedJob.rating}</span>
                      <span className="text-muted-foreground">· {selectedJob.applicants} applicants</span>
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: MapPin, label: "Location", value: selectedJob.location },
                    { icon: Briefcase, label: "Type", value: selectedJob.type },
                    { icon: DollarSign, label: "Salary", value: selectedJob.salary },
                    { icon: Clock, label: "Posted", value: selectedJob.postedAt },
                  ].map((info, idx) => {
                    const Icon = info.icon;
                    return (
                      <div key={idx} className="rounded-lg border border-border/30 bg-card/40 p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="h-3 w-3" />
                          {info.label}
                        </div>
                        <p className="text-sm font-semibold line-clamp-1">{info.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all">
                  Apply Now
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent transition-all">
                  <ExternalLink className="h-4 w-4" />
                  View on Site
                </button>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">About this role</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedJob.description}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We're looking for a passionate and talented individual to join our team. You'll work on challenging
                  problems alongside some of the best engineers in the industry, with the opportunity to make a real
                  impact on our products and users.
                </p>
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Skills Demand for this Role - aggregated insights */}
              {roleSkillStats.skills.length > 0 && (
                <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card/40 to-teal-500/5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600">
                        <BarChart3 className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold tracking-tight">Skills Demand for this Role</h3>
                        <p className="text-[11px] text-muted-foreground">
                          Based on {roleSkillStats.sampleSize} similar listing{roleSkillStats.sampleSize !== 1 ? "s" : ""} aggregated across job boards
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <Target className="h-3 w-3" />
                      AI Insight
                    </span>
                  </div>

                  <div className="space-y-2">
                    {roleSkillStats.skills.map((s) => (
                      <div key={s.skill} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            {s.required ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Layers className="h-3.5 w-3.5 text-muted-foreground/50" />
                            )}
                            <span className={`font-semibold ${s.required ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                              {s.skill}
                            </span>
                            {s.required && (
                              <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                Needed
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground font-medium tabular-nums">{s.percent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              s.required
                                ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                                : "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60"
                            }`}
                            style={{ width: `${s.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        Required for this job
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-muted-foreground/50" />
                        Common in role
                      </span>
                    </div>
                    <span className="font-medium">{selectedJob.skills.length} / {roleSkillStats.skills.length} skills match</span>
                  </div>
                </div>
              )}

              {/* Company Info */}
              <div className="space-y-3 pt-2 border-t border-border/30">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">About {selectedJob.company}</h3>
                <div className="rounded-lg border border-border/30 bg-card/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">1,000+ employees</span>
                    </div>
                    <button className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                      View company →
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A modern company building products that empower millions of users worldwide.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a job to view details
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Trigger - visible when drawer is closed */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white pl-3 pr-4 py-3 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 transition-all"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-emerald-600" />
          </div>
          <span className="text-sm font-semibold hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* Chat Drawer - slides in from right */}
      <div
        className={`fixed top-0 right-0 z-50 h-screen w-full sm:w-[400px] bg-background border-l border-border shadow-2xl transition-transform duration-300 flex flex-col ${
          chatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b bg-gradient-to-r from-emerald-500/10 via-background to-teal-500/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Job Search AI</h3>
              <p className="text-[10px] text-muted-foreground leading-tight flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online · ready to help
              </p>
            </div>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]"
        >
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                  msg.role === "user"
                    ? "bg-muted"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                }`}
              >
                {msg.role === "user" ? (
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm"
                    : "bg-muted/60 text-foreground rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Quick suggestions */}
        {chatMessages.length <= 1 && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Try asking</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Remote React jobs > $150k",
                "Compare ML roles",
                "Skills for senior frontend",
                "Best paying AI jobs",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setChatInput(s);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border/40 bg-card/40 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input */}
        <div className="border-t p-3 shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2 items-end rounded-xl border border-border/40 bg-card/60 px-3 py-2 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              rows={1}
              placeholder="Ask the AI agent..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 resize-none max-h-32 min-w-0"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim()}
              className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:shadow-md hover:shadow-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">
            AI may show inaccurate info · verify job details on source
          </p>
        </div>
      </div>

      {/* Backdrop when chat is open on mobile */}
      {chatOpen && (
        <div
          onClick={() => setChatOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
        />
      )}
    </main>
  );
}
