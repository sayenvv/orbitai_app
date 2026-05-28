"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  Search,
  Sparkles,
  MessageSquare,
  FileText,
  Video,
  ClipboardList,
  PenTool,
  Library,
  Target,
  GraduationCap,
  Clock,
  Star,
  Download,
  Bookmark,
  BookmarkPlus,
  TrendingUp,
  ChevronRight,
  Filter,
  ListChecks,
  HelpCircle,
  Layers,
  Map as MapIcon,
  Wand2,
  Send,
  Bot,
  User as UserIcon,
  RefreshCw,
  Copy,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type MaterialType = "PYQ" | "Notes" | "Video" | "Practice" | "Book" | "Mock Test";

const typeConfig: Record<MaterialType, { color: string; icon: typeof FileText; dot: string }> = {
  PYQ: { color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10", icon: ClipboardList, dot: "bg-amber-500" },
  Notes: { color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10", icon: FileText, dot: "bg-blue-500" },
  Video: { color: "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10", icon: Video, dot: "bg-red-500" },
  Practice: { color: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: PenTool, dot: "bg-emerald-500" },
  Book: { color: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10", icon: Library, dot: "bg-purple-500" },
  "Mock Test": { color: "text-pink-600 dark:text-pink-400 border-pink-500/30 bg-pink-500/10", icon: Target, dot: "bg-pink-500" },
};

interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  code: string;
  type: MaterialType;
  description: string;
  concepts: string[];
  duration?: string;
  pages?: number;
  rating: number;
  downloads: number;
  university: string;
  semester: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  featured?: boolean;
}

const mockMaterials: StudyMaterial[] = [
  {
    id: "1",
    title: "Database Management Systems - Previous Year Papers (2020-2024)",
    subject: "DBMS",
    code: "MCS-023",
    type: "PYQ",
    description: "Solved question papers from June 2020 to December 2024 with detailed answers, marking scheme, and topic-wise analysis.",
    concepts: ["ER Model", "Normalization", "SQL Queries", "Transactions", "Indexing"],
    pages: 84,
    rating: 4.8,
    downloads: 12400,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Intermediate",
    featured: true,
  },
  {
    id: "2",
    title: "Object Oriented Analysis & Design - Complete Notes",
    subject: "OOAD",
    code: "MCS-024",
    type: "Notes",
    description: "Comprehensive handwritten notes covering UML diagrams, design patterns, OOP fundamentals, and case studies.",
    concepts: ["UML Diagrams", "Design Patterns", "OOP Concepts", "Use Cases", "Class Modeling"],
    pages: 156,
    rating: 4.9,
    downloads: 8900,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Intermediate",
    featured: true,
  },
  {
    id: "3",
    title: "Data Communication & Networks - Video Lectures",
    subject: "Networks",
    code: "MCS-022",
    type: "Video",
    description: "45+ hours of expert video lectures covering OSI model, TCP/IP, routing protocols, and network security.",
    concepts: ["OSI Model", "TCP/IP", "Routing", "Network Security", "Subnetting"],
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
    description: "200+ practice problems on process scheduling, memory management, deadlocks, and file systems with stepwise solutions.",
    concepts: ["Process Scheduling", "Deadlocks", "Memory Mgmt", "File Systems"],
    pages: 92,
    rating: 4.6,
    downloads: 7200,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Advanced",
  },
  {
    id: "5",
    title: "Accountancy & Financial Management - Reference Book",
    subject: "Accounting",
    code: "MCS-035",
    type: "Book",
    description: "Complete reference book covering financial accounting principles, cost analysis, and management accounting.",
    concepts: ["Financial Accounting", "Cost Analysis", "Budgeting", "Ratios"],
    pages: 412,
    rating: 4.5,
    downloads: 3400,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Beginner",
  },
  {
    id: "6",
    title: "Full Mock Test - MCA 3rd Sem (All Subjects)",
    subject: "All Subjects",
    code: "MOCK-3",
    type: "Mock Test",
    description: "Timed full-length mock test covering all 3rd semester subjects with auto-evaluation and detailed analytics.",
    concepts: ["DBMS", "OS", "Networks", "OOAD", "Accounting"],
    duration: "3h",
    rating: 4.8,
    downloads: 9800,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Advanced",
    featured: true,
  },
  {
    id: "7",
    title: "SQL Query Practice Workbook",
    subject: "DBMS",
    code: "MCS-023",
    type: "Practice",
    description: "Hands-on SQL workbook with 150+ queries from basic SELECT to advanced joins, subqueries, and window functions.",
    concepts: ["SELECT", "Joins", "Subqueries", "Window Functions"],
    pages: 68,
    rating: 4.7,
    downloads: 6400,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Beginner",
  },
  {
    id: "8",
    title: "UML & Design Patterns - Video Series",
    subject: "OOAD",
    code: "MCS-024",
    type: "Video",
    description: "Visual walkthroughs of all 14 UML diagram types and the 23 Gang of Four design patterns with code examples.",
    concepts: ["UML", "Design Patterns", "Sequence Diagrams", "State Charts"],
    duration: "22h 15m",
    rating: 4.9,
    downloads: 4500,
    university: "IGNOU",
    semester: "MCA 3rd Sem",
    difficulty: "Intermediate",
  },
];

const filterCategories: { label: string; value: MaterialType | "all" | "featured"; count: number }[] = [
  { label: "All", value: "all", count: mockMaterials.length },
  { label: "Featured", value: "featured", count: mockMaterials.filter((m) => m.featured).length },
  { label: "PYQ", value: "PYQ", count: mockMaterials.filter((m) => m.type === "PYQ").length },
  { label: "Notes", value: "Notes", count: mockMaterials.filter((m) => m.type === "Notes").length },
  { label: "Video", value: "Video", count: mockMaterials.filter((m) => m.type === "Video").length },
  { label: "Practice", value: "Practice", count: mockMaterials.filter((m) => m.type === "Practice").length },
  { label: "Book", value: "Book", count: mockMaterials.filter((m) => m.type === "Book").length },
  { label: "Mock Test", value: "Mock Test", count: mockMaterials.filter((m) => m.type === "Mock Test").length },
];

/* ---------------- AI Study-Aid Generators ---------------- */

type GeneratorType = "concepts" | "notes" | "questions" | "flashcards" | "mindmap" | "summary";

const generatorOptions: { type: GeneratorType; label: string; desc: string; icon: typeof FileText }[] = [
  { type: "concepts", label: "Key Concepts", desc: "Bullet list of core ideas", icon: Sparkles },
  { type: "notes", label: "Important Notes", desc: "Condensed study notes", icon: FileText },
  { type: "questions", label: "Important Questions", desc: "Likely exam questions", icon: HelpCircle },
  { type: "flashcards", label: "Flashcards", desc: "Q&A cards for revision", icon: Layers },
  { type: "mindmap", label: "Mind Map", desc: "Visual topic map", icon: MapIcon },
  { type: "summary", label: "Summary", desc: "TL;DR of the material", icon: ListChecks },
];

/* ---------------- Expandable Section Wrapper ---------------- */

function ExpandableSection({
  id,
  title,
  subtitle,
  headerIcon,
  headerGradient = "from-blue-500 to-indigo-600",
  containerClass = "",
  badge,
  expandedId,
  setExpandedId,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  headerIcon?: typeof FileText;
  headerGradient?: string;
  containerClass?: string;
  badge?: React.ReactNode;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const isExpanded = expandedId === id;
  const Icon = headerIcon;

  const inner = (
    <div className={`flex flex-col ${isExpanded ? "h-full" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div className={`p-1.5 rounded-md bg-gradient-to-br ${headerGradient} shrink-0`}>
              <Icon className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {badge}
          <button
            onClick={() => setExpandedId(isExpanded ? null : id)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className={isExpanded ? "flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0 [scrollbar-width:none] pr-1" : ""}>
        {children}
      </div>
    </div>
  );

  if (isExpanded) {
    return (
      <>
        <div
          onClick={() => setExpandedId(null)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
        <div
          className={`fixed inset-4 md:inset-8 lg:inset-16 z-50 rounded-2xl border shadow-2xl p-6 ${containerClass || "bg-background"} flex flex-col`}
        >
          {inner}
        </div>
      </>
    );
  }

  return <div className={`space-y-3 ${containerClass}`}>{inner}</div>;
}

/* ---------------- Question Item (with answer generation) ---------------- */

function QuestionItem({
  index,
  item,
  marks,
  colorClass,
  material,
}: {
  index: number;
  item: { q: string; concept: string; ref: string };
  marks: number;
  colorClass: string;
  material: StudyMaterial;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const generate = () => {
    if (answer) {
      setShowAnswer((s) => !s);
      return;
    }
    setLoading(true);
    setShowAnswer(true);
    setTimeout(() => {
      // Mock AI answer tailored to marks weight
      const intro =
        marks <= 2
          ? `${item.concept} can be defined as a foundational topic in ${material.subject}.`
          : `${item.concept} is a central topic in ${material.subject} (${material.code}).`;
      const body =
        marks >= 10
          ? ` A detailed treatment requires: (1) precise definition, (2) underlying principles and rationale, (3) step-by-step working with an example, (4) diagram/algorithm walkthrough, (5) real-world applications, and (6) limitations or trade-offs. Refer to ${material.title} for the worked case study and figures.`
          : marks >= 5
          ? ` Key points to cover: definition, properties, a short example, and how it relates to other concepts in ${material.semester}. Conclude with one practical use-case.`
          : ` Mention the core idea in one sentence and one defining property.`;
      setAnswer(intro + body);
      setLoading(false);
    }, 900);
  };

  return (
    <li className="rounded-lg border border-border/40 bg-card/30 p-2.5 space-y-2">
      <div className="flex items-start gap-2">
        <span className={`flex-shrink-0 h-5 min-w-[1.25rem] px-1.5 rounded text-[10px] font-bold flex items-center justify-center mt-0.5 border ${colorClass}`}>
          Q{index + 1}
        </span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-foreground leading-relaxed">{item.q}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 border border-border/30 px-1.5 py-0.5 rounded">
              <BookOpen className="h-2.5 w-2.5" />
              <span className="font-medium">Ref:</span>
              <span>{item.ref}</span>
            </span>
            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  Generating...
                </>
              ) : answer ? (
                showAnswer ? (
                  <>
                    <ChevronUp className="h-2.5 w-2.5" />
                    Hide answer
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-2.5 w-2.5" />
                    Show answer
                  </>
                )
              ) : (
                <>
                  <Wand2 className="h-2.5 w-2.5" />
                  Generate answer
                </>
              )}
            </button>
            {answer && !loading && (
              <button
                onClick={() => {
                  setAnswer(null);
                  setShowAnswer(false);
                  setTimeout(generate, 10);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                title="Regenerate"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Regenerate
              </button>
            )}
          </div>
        </div>
      </div>
      {showAnswer && (loading || answer) && (
        <div className="ml-7 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 mb-1">
            AI Answer ({marks} {marks === 1 ? "mark" : "marks"})
          </p>
          {loading ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
              <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <p className="text-xs text-foreground leading-relaxed">{answer}</p>
          )}
        </div>
      )}
    </li>
  );
}

function GeneratorOutput({ type, material }: { type: GeneratorType; material: StudyMaterial }) {
  const concepts = material.concepts;

  if (type === "concepts") {
    return (
      <ul className="space-y-2 text-sm">
        {concepts.map((c, i) => (
          <li key={c} className="flex items-start gap-2">
            <span className="flex-shrink-0 h-5 w-5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-foreground">{c}</p>
              <p className="text-xs text-muted-foreground">Core concept of {material.subject}. Master this for {material.semester}.</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "notes") {
    return (
      <div className="space-y-3 text-sm">
        {concepts.slice(0, 4).map((c) => (
          <div key={c} className="space-y-1">
            <h5 className="font-bold text-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {c}
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed pl-3 border-l-2 border-blue-500/30">
              Important: {c} is a fundamental concept covered in {material.title}. Focus on definitions, properties, and worked examples.
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (type === "questions") {
    // Build a reference string per concept so each question points back into the material
    const makeRef = (conceptIdx: number) => {
      const unit = (conceptIdx % 4) + 1;
      const pageStart = 12 + conceptIdx * 14;
      const pageEnd = pageStart + 6;
      return `Unit ${unit} \u00b7 Pg ${pageStart}\u2013${pageEnd}`;
    };

    type Q = { q: string; concept: string; ref: string };
    const groups: { marks: number; label: string; color: string; questions: Q[] }[] = [
      {
        marks: 1,
        label: "1 Mark Questions",
        color: "emerald",
        questions: concepts.slice(0, 5).map((c, i) => ({ q: `Define ${c}.`, concept: c, ref: makeRef(i) })),
      },
      {
        marks: 2,
        label: "2 Marks Questions",
        color: "sky",
        questions: concepts.slice(0, 4).map((c, i) => ({
          q: `List two key features of ${c}.`,
          concept: c,
          ref: makeRef(i),
        })),
      },
      {
        marks: 5,
        label: "5 Marks Questions",
        color: "amber",
        questions: concepts.slice(0, 4).map((c, i) => {
          const stems = [
            `Explain ${c} with a suitable example.`,
            `Compare and contrast the variations of ${c}.`,
            `Describe the working/algorithm of ${c}.`,
            `Discuss the advantages and disadvantages of ${c}.`,
          ];
          return { q: stems[i % stems.length], concept: c, ref: makeRef(i) };
        }),
      },
      {
        marks: 10,
        label: "10 Marks Questions",
        color: "rose",
        questions: concepts.slice(0, 3).map((c, i) => {
          const stems = [
            `Discuss ${c} in detail. Illustrate with a case study and diagram where appropriate.`,
            `Explain the complete process of ${c}. Justify your answer with examples from ${material.subject}.`,
            `Critically analyse ${c}, its real-world applications, and limitations in the context of ${material.semester}.`,
          ];
          return { q: stems[i % stems.length], concept: c, ref: makeRef(i) };
        }),
      },
    ];

    const colorMap: Record<string, string> = {
      emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      sky: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
      amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      rose: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    };

    return (
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.marks} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorMap[g.color]}`}>
                {g.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{g.questions.length} questions</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <ol className="space-y-2 text-sm pl-1">
              {g.questions.map((item, i) => (
                <QuestionItem
                  key={`${g.marks}-${i}`}
                  index={i}
                  item={item}
                  marks={g.marks}
                  colorClass={colorMap[g.color]}
                  material={material}
                />
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  }

  if (type === "flashcards") {
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        {concepts.slice(0, 4).map((c) => (
          <div key={c} className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">Question</p>
            <p className="text-sm font-semibold">What is {c}?</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 pt-1">Answer</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {c} is a key topic in {material.subject}, essential for {material.semester} exams.
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (type === "mindmap") {
    return (
      <div className="space-y-3 text-sm">
        <div className="text-center">
          <div className="inline-block rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white px-4 py-2 font-bold shadow-md">
            {material.subject}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {concepts.map((c) => (
            <div key={c} className="relative pl-4">
              <span className="absolute left-0 top-2.5 h-px w-3 bg-blue-500/40" />
              <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-2.5 py-1.5 text-xs font-medium">
                {c}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // summary
  return (
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
      <p>
        <span className="font-bold text-foreground">{material.title}</span> ({material.code}) is a {material.difficulty.toLowerCase()}-level
        {" "}{material.type.toLowerCase()} resource for {material.semester} students at {material.university}.
      </p>
      <p>
        It covers <span className="font-semibold text-blue-700 dark:text-blue-400">{concepts.length} key concepts</span>:{" "}
        {concepts.join(", ")}. Estimated study time:{" "}
        {material.pages ? `${Math.ceil(material.pages / 10)} hours of reading` : material.duration ?? "varies"}.
      </p>
      <p className="text-foreground font-medium">
        💡 Focus on understanding the relationships between these concepts rather than memorizing them in isolation.
      </p>
    </div>
  );
}

export default function StudyHelperLibraryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<StudyMaterial | null>(mockMaterials[0]);

  // AI study-aid generator state
  const [activeGenerator, setActiveGenerator] = useState<GeneratorType | null>(null);
  const [generating, setGenerating] = useState(false);

  // Inline doubt-chat state
  const [doubtMessages, setDoubtMessages] = useState<{ role: "user" | "agent"; content: string }[]>([]);
  const [doubtInput, setDoubtInput] = useState("");
  const [doubtLoading, setDoubtLoading] = useState(false);
  const doubtScrollRef = useRef<HTMLDivElement>(null);

  // Expanded section (single section open at a time as a modal-style overlay)
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Reset generator + doubts whenever the selected material changes
  useEffect(() => {
    setActiveGenerator(null);
    setDoubtMessages([]);
    setDoubtInput("");
  }, [selected?.id]);

  useEffect(() => {
    doubtScrollRef.current?.scrollTo({ top: doubtScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [doubtMessages, doubtLoading]);

  const runGenerator = (type: GeneratorType) => {
    setActiveGenerator(type);
    setGenerating(true);
    // Simulated AI generation
    setTimeout(() => setGenerating(false), 700);
  };

  const askDoubt = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !selected) return;
    setDoubtMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setDoubtInput("");
    setDoubtLoading(true);
    setTimeout(() => {
      setDoubtMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: `Great question about "${trimmed}" from ${selected.subject}. In the context of ${selected.title}, here's a simplified explanation: this concept builds on ${selected.concepts[0] ?? "the core fundamentals"} and connects to ${selected.concepts[1] ?? "related topics"}. Want me to give you a worked example or break this down further?`,
        },
      ]);
      setDoubtLoading(false);
    }, 800);
  };

  const toggleSave = (id: string) => {
    setSavedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return mockMaterials.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !m.title.toLowerCase().includes(q) &&
          !m.subject.toLowerCase().includes(q) &&
          !m.code.toLowerCase().includes(q) &&
          !m.concepts.some((c) => c.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      if (activeFilter === "all") return true;
      if (activeFilter === "featured") return m.featured;
      return m.type === activeFilter;
    });
  }, [searchQuery, activeFilter]);

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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-sm font-semibold">Study Library</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/study-helper/chat")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ask AI tutor</span>
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-muted-foreground">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Saved ({savedItems.size})</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero - Compact */}
      <div className="border-b bg-gradient-to-br from-blue-500/5 via-background to-indigo-500/5 px-6 py-4 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight bg-gradient-to-r from-foreground to-blue-600 bg-clip-text text-transparent">
                Your Study Library
              </h2>
              <p className="text-[11px] text-muted-foreground leading-tight">Notes · PYQs · Videos · Mock tests · {mockMaterials.length}+ resources</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 items-center rounded-lg border border-border/40 bg-card/60 backdrop-blur-md px-3 py-2 shadow-sm focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject, code, or topic..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 min-w-0"
              />
              <button className="hidden md:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </button>
            </div>
          </div>

          {/* Inline stats */}
          <div className="hidden xl:flex items-center gap-4 shrink-0 pl-2 border-l border-border/40">
            {[
              { icon: FileText, label: "Materials", value: `${mockMaterials.length}` },
              { icon: GraduationCap, label: "Courses", value: "MCA" },
              { icon: TrendingUp, label: "Updated", value: "Today" },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <div className="leading-none">
                    <p className="text-sm font-bold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
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
          {filterCategories.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeFilter === f.value
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                  : "border border-border/40 bg-card/40 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f.value ? "bg-white/20" : "bg-muted-foreground/10"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 overflow-hidden flex">
        {/* Materials list */}
        <div className="w-full lg:w-2/5 border-r overflow-y-auto [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]">
          <div className="p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No materials found</div>
            ) : (
              filtered.map((m) => {
                const cfg = typeConfig[m.type];
                const TypeIcon = cfg.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`group w-full text-left relative rounded-xl border p-4 transition-all duration-300 overflow-hidden ${
                      selected?.id === m.id
                        ? "border-blue-500/50 bg-blue-500/5 shadow-md"
                        : "border-border/30 bg-card/40 backdrop-blur-sm hover:border-blue-500/30 hover:bg-card/60 hover:shadow-md"
                    }`}
                  >
                    {m.featured && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-2 py-0.5">
                        <Star className="h-3 w-3 text-amber-600 dark:text-amber-400 fill-current" />
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Featured</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 h-12 w-12 rounded-lg border flex items-center justify-center ${cfg.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {m.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <p className="text-xs text-muted-foreground font-medium">{m.subject} · {m.code}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                              {m.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {m.semester}
                          </span>
                          {m.pages && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{m.pages}p</span>}
                          {m.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.duration}</span>}
                          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-current" />{m.rating}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {m.concepts.slice(0, 3).map((c) => (
                            <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                              {c}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {(m.downloads / 1000).toFixed(1)}k downloads
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSave(m.id);
                            }}
                            className="p-1 rounded hover:bg-accent transition-colors"
                          >
                            {savedItems.has(m.id) ? (
                              <Bookmark className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 fill-current" />
                            ) : (
                              <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="hidden lg:flex flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]">
          {selected ? (
            <div className="w-full p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 h-16 w-16 rounded-xl border flex items-center justify-center ${typeConfig[selected.type].color}`}>
                    {(() => {
                      const Icon = typeConfig[selected.type].icon;
                      return <Icon className="h-7 w-7" />;
                    })()}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight leading-snug">{selected.title}</h2>
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">
                          {selected.subject} · {selected.code} · {selected.university}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleSave(selected.id)}
                        className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        {savedItems.has(selected.id) ? (
                          <Bookmark className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-current" />
                        ) : (
                          <BookmarkPlus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeConfig[selected.type].color}`}>
                        {selected.type}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold">
                        {selected.difficulty}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-current" />
                        {selected.rating} · {(selected.downloads / 1000).toFixed(1)}k downloads
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: GraduationCap, label: "Course", value: selected.semester },
                    { icon: Library, label: "Source", value: selected.university },
                    selected.pages
                      ? { icon: FileText, label: "Length", value: `${selected.pages} pages` }
                      : { icon: Clock, label: "Duration", value: selected.duration || "—" },
                    { icon: Target, label: "Level", value: selected.difficulty },
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

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all">
                  <BookOpen className="h-4 w-4" />
                  Open Material
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent transition-all">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>

              {/* Description (no expand button) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
                    <BookOpen className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight">About this material</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
              </div>

              {/* Concepts Covered + Study Aids (single expand button) */}
              <ExpandableSection
                id="concepts"
                title="Concepts Covered & Study Aids"
                subtitle={`${selected.concepts.length} topics · AI-generated study material`}
                headerIcon={Sparkles}
                containerClass="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-card/40 to-indigo-500/5 p-5"
                badge={
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400 mr-1">
                    <Sparkles className="h-3 w-3" />
                    AI
                  </span>
                }
                expandedId={expandedSection}
                setExpandedId={setExpandedSection}
              >
                <div className="space-y-5">
                  {/* Concept chips */}
                  <div className="flex flex-wrap gap-2">
                    {selected.concepts.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                      >
                        <Sparkles className="h-3 w-3" />
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Divider with label */}
                  <div className="flex items-center gap-2 pt-1">
                    <Wand2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Generate Study Aids with AI</h4>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>

                  <div className={`grid gap-2 ${expandedSection === "concepts" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 md:grid-cols-3"}`}>
                  {generatorOptions.map((g) => {
                    const Icon = g.icon;
                    const isActive = activeGenerator === g.type;
                    return (
                      <button
                        key={g.type}
                        onClick={() => runGenerator(g.type)}
                        className={`group flex items-start gap-2 rounded-lg border p-3 text-left transition-all ${
                          isActive
                            ? "border-blue-500/60 bg-blue-500/10 shadow-sm"
                            : "border-border/40 bg-card/40 hover:border-blue-500/40 hover:bg-blue-500/5"
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-md transition-colors ${
                            isActive
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold leading-tight">{g.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{g.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                  </div>

                {/* Generated output */}
                {activeGenerator && (
                  <div className="rounded-lg border border-blue-500/30 bg-background/60 backdrop-blur-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const opt = generatorOptions.find((o) => o.type === activeGenerator);
                          const Icon = opt?.icon ?? Wand2;
                          return (
                            <>
                              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <h4 className="text-sm font-bold">{opt?.label}</h4>
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => runGenerator(activeGenerator)}
                          className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
                          title="Regenerate"
                        >
                          <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
                        </button>
                        <button className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground" title="Copy">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {generating ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                        <span>Generating with AI...</span>
                      </div>
                    ) : (
                      <GeneratorOutput type={activeGenerator} material={selected} />
                    )}
                  </div>
                )}
                </div>
              </ExpandableSection>

              {/* Inline Doubt-Clearing Chat */}
              <ExpandableSection
                id="doubt"
                title="Ask a Doubt"
                subtitle="Chat with AI tutor about this material"
                headerIcon={MessageSquare}
                headerGradient="from-indigo-500 to-blue-600"
                containerClass="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-card/40 to-blue-500/5 p-5"
                badge={
                  <button
                    onClick={() => router.push("/study-helper/chat")}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mr-1"
                  >
                    Full chat
                    <ChevronRight className="h-3 w-3" />
                  </button>
                }
                expandedId={expandedSection}
                setExpandedId={setExpandedSection}
              >
                <div className={`flex flex-col gap-3 ${expandedSection === "doubt" ? "h-full" : ""}`}>
                {/* Doubt messages */}
                {doubtMessages.length > 0 && (
                  <div
                    ref={doubtScrollRef}
                    className={`${expandedSection === "doubt" ? "flex-1" : "max-h-64"} overflow-y-auto space-y-2.5 rounded-lg border border-border/30 bg-background/40 p-3 [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]`}
                  >
                    {doubtMessages.map((m, idx) => {
                      const isUser = m.role === "user";
                      return (
                        <div key={idx} className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                          <div
                            className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                              isUser ? "bg-muted" : "bg-gradient-to-br from-indigo-500 to-blue-600"
                            }`}
                          >
                            {isUser ? (
                              <UserIcon className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Bot className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                              isUser
                                ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-tr-sm"
                                : "bg-muted/60 text-foreground rounded-tl-sm"
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })}
                    {doubtLoading && (
                      <div className="flex gap-2">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                        <div className="rounded-xl rounded-tl-sm bg-muted/60 px-3 py-2 flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested doubts */}
                {doubtMessages.length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      `Explain ${selected.concepts[0] ?? "the basics"}`,
                      `Examples of ${selected.concepts[1] ?? "key topics"}`,
                      "Most asked exam questions",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => askDoubt(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border/40 bg-card/40 hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Doubt input */}
                <div className="flex gap-2 items-end rounded-xl border border-border/40 bg-background/60 px-3 py-2 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <textarea
                    value={doubtInput}
                    onChange={(e) => setDoubtInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        askDoubt(doubtInput);
                      }
                    }}
                    rows={1}
                    placeholder="Type your doubt here..."
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 resize-none max-h-24 py-1 min-w-0"
                  />
                  <button
                    onClick={() => askDoubt(doubtInput)}
                    disabled={!doubtInput.trim()}
                    className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white hover:shadow-md hover:shadow-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
                </div>
              </ExpandableSection>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a material to view details
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
