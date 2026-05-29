import {
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Bus,
  Calculator,
  Calendar,
  Camera,
  Car,
  ChartLine,
  Clock,
  Cloud,
  Code,
  Code2,
  Compass,
  Cpu,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Headphones,
  Heart,
  Hotel,
  Image as ImageIcon,
  Languages,
  Laptop,
  Lightbulb,
  MapPin,
  MessageSquare,
  Microscope,
  Music,
  Palette,
  PenTool,
  Plane,
  Rocket,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  Train,
  Trophy,
  Users,
  Utensils,
  Video,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Lucide icon name stored in API `icon_key` / JSON `iconKey`. */
export type AgentIconKey = string;

export type AgentIconOption = {
  key: AgentIconKey;
  icon: LucideIcon;
  label: string;
};

export type AgentColorOption = {
  key: string;
  gradient: string;
  bgColor: string;
  label: string;
  /** CSS gradient — used when Tailwind classes are not emitted (dynamic API keys). */
  gradientCss: string;
  cardBgCss: string;
  cardBgDarkCss: string;
};

/** All icons available for agents (and shared with widget icon keys). */
export const AGENT_ICON_OPTIONS: AgentIconOption[] = [
  { key: "BookOpen", icon: BookOpen, label: "Book" },
  { key: "Briefcase", icon: Briefcase, label: "Briefcase" },
  { key: "Brain", icon: Brain, label: "Brain" },
  { key: "Code", icon: Code, label: "Code" },
  { key: "Code2", icon: Code2, label: "Code block" },
  { key: "GraduationCap", icon: GraduationCap, label: "Graduation" },
  { key: "Languages", icon: Languages, label: "Languages" },
  { key: "Plane", icon: Plane, label: "Travel" },
  { key: "Hotel", icon: Hotel, label: "Hotel" },
  { key: "Train", icon: Train, label: "Train" },
  { key: "Bus", icon: Bus, label: "Bus" },
  { key: "Car", icon: Car, label: "Car" },
  { key: "MapPin", icon: MapPin, label: "Map" },
  { key: "Globe", icon: Globe, label: "Globe" },
  { key: "MessageSquare", icon: MessageSquare, label: "Chat" },
  { key: "Bot", icon: Bot, label: "Bot" },
  { key: "Sparkles", icon: Sparkles, label: "Sparkles" },
  { key: "Compass", icon: Compass, label: "Compass" },
  { key: "Heart", icon: Heart, label: "Heart" },
  { key: "Music", icon: Music, label: "Music" },
  { key: "Headphones", icon: Headphones, label: "Audio" },
  { key: "Video", icon: Video, label: "Video" },
  { key: "Camera", icon: Camera, label: "Camera" },
  { key: "Image", icon: ImageIcon, label: "Image" },
  { key: "ShoppingBag", icon: ShoppingBag, label: "Shopping" },
  { key: "Wallet", icon: Wallet, label: "Wallet" },
  { key: "Rocket", icon: Rocket, label: "Rocket" },
  { key: "Target", icon: Target, label: "Target" },
  { key: "Trophy", icon: Trophy, label: "Trophy" },
  { key: "Star", icon: Star, label: "Star" },
  { key: "Lightbulb", icon: Lightbulb, label: "Ideas" },
  { key: "PenTool", icon: PenTool, label: "Design" },
  { key: "Palette", icon: Palette, label: "Palette" },
  { key: "FileText", icon: FileText, label: "Document" },
  { key: "BarChart3", icon: BarChart3, label: "Chart" },
  { key: "ChartLine", icon: ChartLine, label: "Analytics" },
  { key: "Calculator", icon: Calculator, label: "Math" },
  { key: "Microscope", icon: Microscope, label: "Science" },
  { key: "FlaskConical", icon: FlaskConical, label: "Lab" },
  { key: "Stethoscope", icon: Stethoscope, label: "Health" },
  { key: "Utensils", icon: Utensils, label: "Food" },
  { key: "Users", icon: Users, label: "People" },
  { key: "Building2", icon: Building2, label: "Business" },
  { key: "Laptop", icon: Laptop, label: "Laptop" },
  { key: "Cpu", icon: Cpu, label: "Tech" },
  { key: "Wrench", icon: Wrench, label: "Tools" },
  { key: "Settings", icon: Settings, label: "Settings" },
  { key: "Shield", icon: Shield, label: "Security" },
  { key: "Search", icon: Search, label: "Search" },
  { key: "Calendar", icon: Calendar, label: "Calendar" },
  { key: "Clock", icon: Clock, label: "Clock" },
  { key: "Cloud", icon: Cloud, label: "Cloud" },
  { key: "Zap", icon: Zap, label: "Energy" },
];

/** Accent colors for agent cards (matches chat home + control center seeds). */
export const AGENT_COLOR_OPTIONS: AgentColorOption[] = [
  {
    key: "indigo",
    gradient: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    label: "Indigo",
    gradientCss: "linear-gradient(to bottom right, #3b82f6, #4f46e5)",
    cardBgCss: "#eff6ff",
    cardBgDarkCss: "rgba(23, 37, 84, 0.3)",
  },
  {
    key: "emerald",
    gradient: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    label: "Emerald",
    gradientCss: "linear-gradient(to bottom right, #10b981, #0d9488)",
    cardBgCss: "#ecfdf5",
    cardBgDarkCss: "rgba(6, 44, 35, 0.3)",
  },
  {
    key: "violet",
    gradient: "from-purple-500 to-violet-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    label: "Violet",
    gradientCss: "linear-gradient(to bottom right, #a855f7, #7c3aed)",
    cardBgCss: "#faf5ff",
    cardBgDarkCss: "rgba(46, 16, 101, 0.3)",
  },
  {
    key: "amber",
    gradient: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    label: "Amber",
    gradientCss: "linear-gradient(to bottom right, #f97316, #d97706)",
    cardBgCss: "#fff7ed",
    cardBgDarkCss: "rgba(67, 20, 7, 0.3)",
  },
  {
    key: "rose",
    gradient: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    label: "Rose",
    gradientCss: "linear-gradient(to bottom right, #ec4899, #e11d48)",
    cardBgCss: "#fdf2f8",
    cardBgDarkCss: "rgba(80, 7, 36, 0.3)",
  },
  {
    key: "sky",
    gradient: "from-cyan-500 to-sky-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    label: "Sky",
    gradientCss: "linear-gradient(to bottom right, #06b6d4, #0284c7)",
    cardBgCss: "#ecfeff",
    cardBgDarkCss: "rgba(8, 51, 68, 0.3)",
  },
  {
    key: "sunset",
    gradient: "from-orange-500 to-rose-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    label: "Sunset",
    gradientCss: "linear-gradient(to bottom right, #f97316, #e11d48)",
    cardBgCss: "#fff7ed",
    cardBgDarkCss: "rgba(67, 20, 7, 0.3)",
  },
  {
    key: "fuchsia",
    gradient: "from-fuchsia-500 to-pink-600",
    bgColor: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    label: "Fuchsia",
    gradientCss: "linear-gradient(to bottom right, #d946ef, #db2777)",
    cardBgCss: "#fdf4ff",
    cardBgDarkCss: "rgba(74, 4, 78, 0.3)",
  },
  {
    key: "lime",
    gradient: "from-lime-500 to-green-600",
    bgColor: "bg-lime-50 dark:bg-lime-950/30",
    label: "Lime",
    gradientCss: "linear-gradient(to bottom right, #84cc16, #16a34a)",
    cardBgCss: "#f7fee7",
    cardBgDarkCss: "rgba(26, 46, 5, 0.3)",
  },
  {
    key: "red",
    gradient: "from-red-500 to-rose-600",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    label: "Red",
    gradientCss: "linear-gradient(to bottom right, #ef4444, #e11d48)",
    cardBgCss: "#fef2f2",
    cardBgDarkCss: "rgba(69, 10, 10, 0.3)",
  },
  {
    key: "slate",
    gradient: "from-slate-500 to-zinc-700",
    bgColor: "bg-slate-50 dark:bg-slate-950/30",
    label: "Slate",
    gradientCss: "linear-gradient(to bottom right, #64748b, #3f3f46)",
    cardBgCss: "#f8fafc",
    cardBgDarkCss: "rgba(15, 23, 42, 0.3)",
  },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  AGENT_ICON_OPTIONS.map((o) => [o.key, o.icon]),
);

const COLOR_BY_KEY: Record<string, AgentColorOption> = Object.fromEntries(
  AGENT_COLOR_OPTIONS.map((c) => [c.key, c]),
);

/** Legacy / chat-app aliases → canonical color keys. */
const COLOR_ALIASES: Record<string, string> = {
  orange: "amber",
  pink: "rose",
  coral: "sunset",
};

export function resolveAgentIcon(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey] ?? Bot;
}

export function resolveAgentGradient(colorKey: string): string {
  const canonical = COLOR_ALIASES[colorKey] ?? colorKey;
  return COLOR_BY_KEY[canonical]?.gradient ?? COLOR_BY_KEY.indigo.gradient;
}

export function resolveAgentPalette(colorKey: string): AgentColorOption {
  const canonical = COLOR_ALIASES[colorKey] ?? colorKey;
  return COLOR_BY_KEY[canonical] ?? COLOR_BY_KEY.indigo;
}

export function isKnownAgentIconKey(iconKey: string): boolean {
  return iconKey in ICON_MAP;
}

export function isKnownAgentColorKey(colorKey: string): boolean {
  const canonical = COLOR_ALIASES[colorKey] ?? colorKey;
  return canonical in COLOR_BY_KEY;
}
