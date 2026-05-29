"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Briefcase,
  Brain,
  Code,
  GraduationCap,
  Languages,
  Plane,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { publicApi, type ApiAgent } from "@/lib/orbit-api";
import { agents as fallbackAgents, type HomeAgent } from "@/lib/home-data";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Briefcase,
  Brain,
  Code,
  GraduationCap,
  Languages,
  Plane,
  Sparkles,
};

const COLOR_MAP: Record<string, { color: string; bgColor: string }> = {
  indigo: { color: "from-blue-500 to-indigo-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  emerald: { color: "from-emerald-500 to-teal-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  violet: { color: "from-purple-500 to-violet-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  orange: { color: "from-orange-500 to-amber-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  pink: { color: "from-pink-500 to-rose-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  sky: { color: "from-cyan-500 to-sky-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  rose: { color: "from-orange-500 to-rose-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
};

function mapApiAgent(raw: ApiAgent): HomeAgent {
  const fallback = fallbackAgents.find((a) => a.id === raw.slug);
  const palette = COLOR_MAP[raw.color_key] ?? COLOR_MAP.indigo;
  const Icon = ICON_MAP[raw.icon_key] ?? fallback?.icon ?? Sparkles;

  return {
    id: raw.slug,
    name: raw.name,
    shortName: raw.short_name,
    description: raw.description,
    icon: Icon,
    color: fallback?.color ?? palette.color,
    bgColor: fallback?.bgColor ?? palette.bgColor,
  };
}

export function useAgents() {
  const [agents, setAgents] = useState<HomeAgent[]>(fallbackAgents);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi
      .agents()
      .then((res) => {
        if (res.data?.length) {
          setAgents(res.data.map(mapApiAgent));
        }
      })
      .catch(() => {
        // keep static fallback list
      })
      .finally(() => setLoading(false));
  }, []);

  return { agents, loading };
}
