import { buildHomeAgent, type HomeAgent } from "@/lib/agent-display";

export type { HomeAgent };

export type LibraryItem = {
  id: string;
  title: string;
  type: string;
  source: string;
  date: string;
};

export const libraryItems: LibraryItem[] = [
  { id: "l1", title: "Biology Ch.4 — Cell Division (Notes)", type: "Notes", source: "Study Helper", date: "Today" },
  { id: "l2", title: "Resume — Senior PM (v3)", type: "Document", source: "Job Search", date: "Yesterday" },
  { id: "l3", title: "React useEffect deep-dive", type: "Generated", source: "Coding Tutor", date: "2 days ago" },
  { id: "l4", title: "Spanish A2 flashcards", type: "Flashcards", source: "Language Learning", date: "3 days ago" },
  { id: "l5", title: "Tokyo 7-day itinerary", type: "Plan", source: "Trip Adviser", date: "Last week" },
  { id: "l6", title: "Algorithms cheat sheet (PDF)", type: "Upload", source: "My uploads", date: "Last week" },
];

/** Offline fallback when the public agents API is unavailable. */
const FALLBACK_AGENT_SEEDS = [
  {
    id: "study-helper",
    name: "Study Helper",
    shortName: "Study",
    description: "Get help with study materials, notes, and exam preparation",
    iconKey: "BookOpen",
    colorKey: "indigo",
  },
  {
    id: "job-search",
    name: "Job Search Assistant",
    shortName: "Jobs",
    description: "Resume tips, interview prep, and job hunting strategies",
    iconKey: "Briefcase",
    colorKey: "emerald",
  },
  {
    id: "coding-tutor",
    name: "Coding Tutor",
    shortName: "Code",
    description: "Learn programming concepts, debug code, and build projects",
    iconKey: "Code",
    colorKey: "violet",
  },
  {
    id: "career-guidance",
    name: "Career Guidance",
    shortName: "Career",
    description: "Explore career paths, skill development, and growth plans",
    iconKey: "GraduationCap",
    colorKey: "amber",
  },
  {
    id: "language-learning",
    name: "Language Learning",
    shortName: "Language",
    description: "Practice languages, grammar help, and conversation practice",
    iconKey: "Languages",
    colorKey: "rose",
  },
  {
    id: "general-knowledge",
    name: "General Knowledge",
    shortName: "Ask",
    description: "Ask anything — science, history, math, and more",
    iconKey: "Brain",
    colorKey: "sky",
  },
  {
    id: "trip-adviser",
    name: "Trip Adviser",
    shortName: "Travel",
    description: "Plan trips, find destinations, hotels, flights, and itineraries",
    iconKey: "Plane",
    colorKey: "sunset",
  },
] as const;

export const agents: HomeAgent[] = FALLBACK_AGENT_SEEDS.map(buildHomeAgent);

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
