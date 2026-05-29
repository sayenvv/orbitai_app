"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  ChevronRight,
  Compass,
  FileText,
  Video,
  ClipboardList,
  Brain,
  GraduationCap,
  Library,
  Download,
  Star,
  Clock,
  Target,
  PenTool,
  Lightbulb,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type MaterialType = "PYQ" | "Notes" | "Video" | "Practice" | "Book" | "Mock Test";

const typeConfig: Record<MaterialType, { color: string; icon: typeof FileText }> = {
  PYQ: { color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10", icon: ClipboardList },
  Notes: { color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10", icon: FileText },
  Video: { color: "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10", icon: Video },
  Practice: { color: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: PenTool },
  Book: { color: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10", icon: Library },
  "Mock Test": { color: "text-pink-600 dark:text-pink-400 border-pink-500/30 bg-pink-500/10", icon: Target },
};

interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  code?: string;
  type: MaterialType;
  description: string;
  concepts: string[];
  duration?: string;
  pages?: number;
  rating: number;
  downloads?: number;
  university?: string;
  semester?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
}

const sampleMaterials: StudyMaterial[] = [
  {
    id: "1",
    title: "Database Management Systems - Previous Year Papers",
    subject: "DBMS",
    code: "MCS-023",
    type: "PYQ",
    description: "Solved question papers from June 2020 to December 2024 with detailed answers and marking scheme.",
    concepts: ["ER Model", "Normalization", "SQL Queries", "Transactions", "Indexing"],
    pages: 84,
    rating: 4.8,
    downloads: 12400,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Intermediate",
  },
  {
    id: "2",
    title: "Object Oriented Analysis & Design - Complete Notes",
    subject: "OOAD",
    code: "MCS-024",
    type: "Notes",
    description: "Comprehensive handwritten notes covering UML, design patterns, and case studies.",
    concepts: ["UML Diagrams", "Design Patterns", "OOP Concepts", "Use Cases"],
    pages: 156,
    rating: 4.9,
    downloads: 8900,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Intermediate",
  },
  {
    id: "3",
    title: "Data Communication & Networks - Video Lectures",
    subject: "Networks",
    code: "MCS-022",
    type: "Video",
    description: "45+ hours of video lectures covering OSI model, TCP/IP, routing, and security.",
    concepts: ["OSI Model", "TCP/IP", "Routing", "Network Security"],
    duration: "45h 30m",
    rating: 4.7,
    downloads: 5600,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Intermediate",
  },
  {
    id: "4",
    title: "Operating System - Practice Questions & Solutions",
    subject: "OS",
    code: "MCS-022",
    type: "Practice",
    description: "200+ practice problems on process scheduling, memory management, and file systems.",
    concepts: ["Process Scheduling", "Deadlocks", "Memory Mgmt", "File Systems"],
    pages: 92,
    rating: 4.6,
    downloads: 7200,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Advanced",
  },
];

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  materials?: StudyMaterial[];
  topics?: { label: string; emoji: string }[];
}

const quickPrompts = [
  { icon: GraduationCap, label: "MCA IGNOU 3rd semester study materials" },
  { icon: ClipboardList, label: "Previous year questions for DBMS" },
  { icon: Brain, label: "Explain normalization in databases" },
  { icon: Target, label: "Mock tests for upcoming exam" },
];

export default function StudyHelperChatPage() {
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

    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "agent",
        content: `Great question! I found ${sampleMaterials.length} curated study resources for "${trimmed}". Here are the key concepts and materials you should focus on:`,
        topics: [
          { label: "Core Concepts", emoji: "🧠" },
          { label: "Exam Patterns", emoji: "📝" },
          { label: "Practice Sets", emoji: "🎯" },
          { label: "Reference Books", emoji: "📚" },
        ],
        materials: sampleMaterials,
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);
    }, 900);
  };

  const exploreAll = () => {
    router.push("/study-helper");
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
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-background animate-pulse" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold">Study Helper</h1>
              <p className="text-[10px] text-muted-foreground">AI tutor · notes, PYQs, videos & practice</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exploreAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <Library className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Browse library</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {isEmpty ? (
            <EmptyState onPrompt={sendMessage} />
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} onExplore={exploreAll} />)
          )}
          {isTyping && <TypingIndicator />}
        </div>
      </div>

      <div className="border-t bg-background/80 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end rounded-2xl border border-border/40 bg-card/60 px-3 py-2 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mb-2" />
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
              placeholder="Ask anything... 'MCA IGNOU 3rd sem DBMS notes'"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 resize-none max-h-32 py-1.5 min-w-0"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-md hover:shadow-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">
            Study Helper AI · always cross-verify with your official syllabus
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
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
          <BookOpen className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-blue-600 bg-clip-text text-transparent">
          Study Helper
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tell me your course, semester, or topic. I&apos;ll fetch notes, past papers, video lectures, and practice tests.
        </p>
      </div>

      {/* Supported material types */}
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(typeConfig) as MaterialType[]).map((t) => {
          const cfg = typeConfig[t];
          const Icon = cfg.icon;
          return (
            <span key={t} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${cfg.color}`}>
              <Icon className="h-3 w-3" />
              {t}
            </span>
          );
        })}
      </div>

      {/* Quick prompts */}
      <div className="grid sm:grid-cols-2 gap-2 pt-2">
        {quickPrompts.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.label}
              onClick={() => onPrompt(p.label)}
              className="group text-left rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all"
            >
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 transition-colors">
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
          isUser ? "bg-muted" : "bg-gradient-to-br from-blue-500 to-indigo-600"
        }`}
      >
        {isUser ? <UserIcon className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-white" />}
      </div>

      <div className={`flex-1 max-w-[85%] space-y-3 ${isUser ? "flex flex-col items-end" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-sm"
              : "bg-muted/60 text-foreground rounded-tl-sm"
          }`}
        >
          {msg.content}
        </div>

        {/* Topic chips */}
        {msg.topics && (
          <div className="flex flex-wrap gap-2 w-full">
            {msg.topics.map((t) => (
              <div
                key={t.label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/40 backdrop-blur-sm px-3 py-1.5 text-xs font-medium"
              >
                <span>{t.emoji}</span>
                {t.label}
              </div>
            ))}
          </div>
        )}

        {/* Study material cards */}
        {msg.materials && msg.materials.length > 0 && (
          <div className="space-y-2 w-full">
            {msg.materials.map((m) => (
              <StudyMaterialCard key={m.id} material={m} onView={onExplore} />
            ))}

            {/* Explore more CTA */}
            <button
              onClick={onExplore}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/60 px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-400 transition-all"
            >
              <Compass className="h-4 w-4" />
              Explore full study library
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StudyMaterialCard({ material, onView }: { material: StudyMaterial; onView: () => void }) {
  const cfg = typeConfig[material.type];
  const TypeIcon = cfg.icon;
  return (
    <div className="group relative rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3.5 hover:border-blue-500/40 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        {/* Type icon block */}
        <div className={`flex-shrink-0 h-11 w-11 rounded-lg flex items-center justify-center border ${cfg.color}`}>
          <TypeIcon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {material.title}
              </h4>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="text-xs text-muted-foreground font-medium">
                  {material.subject}
                  {material.code && <span className="text-muted-foreground/70"> · {material.code}</span>}
                </p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                  {material.type}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{material.description}</p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {material.semester && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {material.semester}
              </span>
            )}
            {material.university && (
              <span className="flex items-center gap-1">
                <Library className="h-3 w-3" />
                {material.university}
              </span>
            )}
            {material.pages && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {material.pages} pages
              </span>
            )}
            {material.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {material.duration}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-current" />
              {material.rating}
            </span>
            {material.downloads && (
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {(material.downloads / 1000).toFixed(1)}k
              </span>
            )}
          </div>

          {/* Concept tags */}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {material.concepts.slice(0, 4).map((c) => (
              <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                {c}
              </span>
            ))}
            {material.concepts.length > 4 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                +{material.concepts.length - 4} more
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              onClick={onView}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open material
              <ChevronRight className="h-3 w-3" />
            </button>
            <button className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-3 w-3" />
              Download
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
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
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
