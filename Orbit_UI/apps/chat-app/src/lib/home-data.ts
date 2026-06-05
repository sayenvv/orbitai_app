import { buildHomeAgent, type HomeAgent } from "@/lib/agent-display";

export type { HomeAgent };

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
