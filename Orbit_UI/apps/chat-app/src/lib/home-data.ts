import {
  BookOpen,
  Briefcase,
  Brain,
  Code,
  GraduationCap,
  Languages,
  Plane,
  type LucideIcon,
} from "lucide-react";

export type HomeAgent = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

export type QuickPrompt = {
  label: string;
  prompt: string;
  icon: string;
};

export type RecentChat = {
  id: string;
  title: string;
  agent: string;
  time: string;
  preview: string;
};

export const quickPrompts: QuickPrompt[] = [
  { label: "Explain", prompt: "Explain this concept in simple terms:", icon: "💡" },
  { label: "Study plan", prompt: "Help me create a study plan for:", icon: "📚" },
  { label: "Write code", prompt: "Write code that:", icon: "💻" },
  { label: "Summarize", prompt: "Summarize the following:", icon: "📝" },
  { label: "Interview", prompt: "Help me practice for a job interview in:", icon: "🎯" },
  { label: "Translate", prompt: "Translate the following to:", icon: "🌐" },
];

export const recentChats: RecentChat[] = [
  { id: "1", title: "React hooks explanation", agent: "Coding Tutor", time: "2h ago", preview: "Can you explain useEffect..." },
  { id: "2", title: "Resume review feedback", agent: "Job Search", time: "Yesterday", preview: "I need help improving my..." },
  { id: "3", title: "Spanish basics lesson", agent: "Language", time: "2d ago", preview: "How do I conjugate..." },
];

export const agents: HomeAgent[] = [
  {
    id: "study-helper",
    name: "Study Helper",
    shortName: "Study",
    description: "Get help with study materials, notes, and exam preparation",
    icon: BookOpen,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "job-search",
    name: "Job Search Assistant",
    shortName: "Jobs",
    description: "Resume tips, interview prep, and job hunting strategies",
    icon: Briefcase,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    id: "coding-tutor",
    name: "Coding Tutor",
    shortName: "Code",
    description: "Learn programming concepts, debug code, and build projects",
    icon: Code,
    color: "from-purple-500 to-violet-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "career-guidance",
    name: "Career Guidance",
    shortName: "Career",
    description: "Explore career paths, skill development, and growth plans",
    icon: GraduationCap,
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    id: "language-learning",
    name: "Language Learning",
    shortName: "Language",
    description: "Practice languages, grammar help, and conversation practice",
    icon: Languages,
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
  },
  {
    id: "general-knowledge",
    name: "General Knowledge",
    shortName: "Ask",
    description: "Ask anything — science, history, math, and more",
    icon: Brain,
    color: "from-cyan-500 to-sky-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  {
    id: "trip-adviser",
    name: "Trip Adviser",
    shortName: "Travel",
    description: "Plan trips, find destinations, hotels, flights, and itineraries",
    icon: Plane,
    color: "from-orange-500 to-rose-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
];

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function routeForAgent(agentId: string): string {
  if (agentId === "job-search") return "/job-search/chat";
  if (agentId === "study-helper") return "/study-helper/chat";
  if (agentId === "trip-adviser") return "/trip-adviser/chat";
  return `/c?agent=${agentId}`;
}
