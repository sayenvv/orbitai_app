import type { LucideIcon } from "lucide-react";
import { BookOpen, Lightbulb, Sparkles, Zap } from "lucide-react";
import { BRAND_NAME } from "@orbit/ui";

export type ChatSideRailPromo = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  features: string[];
};

export type ChatSideRailAd = {
  id: string;
  company: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
};

export type ChatSideRailLink = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const CHAT_SIDE_RAIL_UPGRADE: ChatSideRailPromo = {
  id: "upgrade",
  eyebrow: `${BRAND_NAME} Pro`,
  title: "Work without limits",
  description: "More tokens, faster responses, and full access to study insights on every plan upgrade.",
  ctaLabel: "Compare plans",
  href: "/plans",
  imageUrl:
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
  imageAlt: "Analytics dashboard on a laptop",
  features: ["Higher monthly allowance", "Priority response speed", "PDF insights & exports"],
};

/** Third-party company advertisements shown in the resources rail. */
export const CHAT_SIDE_RAIL_ADS: ChatSideRailAd[] = [
  {
    id: "ad-notion",
    company: "Notion",
    title: "One workspace for your team",
    description: "Notes, docs, wikis, and projects — connected so your team moves faster.",
    ctaLabel: "Try Notion free",
    href: "https://www.notion.com",
    imageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Modern office workspace with laptop",
  },
  {
    id: "ad-grammarly",
    company: "Grammarly",
    title: "Write with confidence",
    description: "Real-time suggestions for clarity, tone, and grammar across every app you use.",
    ctaLabel: "Get Grammarly",
    href: "https://www.grammarly.com",
    imageUrl:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Person writing in a notebook",
  },
  {
    id: "ad-coursera",
    company: "Coursera",
    title: "Learn skills that move your career",
    description: "Courses and certificates from leading universities and companies, on your schedule.",
    ctaLabel: "Browse courses",
    href: "https://www.coursera.org",
    imageUrl:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Students learning together with laptops",
  },
];

export const CHAT_SIDE_RAIL_LINKS: ChatSideRailLink[] = [
  {
    id: "insights",
    label: "Study insights",
    description: "Notes and tools from your PDFs",
    href: "/insights",
    icon: Lightbulb,
  },
  {
    id: "library",
    label: "Library",
    description: "Uploads and generated files",
    href: "/?section=library",
    icon: BookOpen,
  },
  {
    id: "agents",
    label: "All agents",
    description: "Browse specialized assistants",
    href: "/?section=agents",
    icon: Sparkles,
  },
];

export const CHAT_SIDE_RAIL_TIP = {
  title: "Quick tip",
  description: "Attach a PDF in chat to ask questions grounded in your document.",
  icon: Zap,
};

export const CHAT_SIDE_RAIL_FOOTER = {
  label: "Ads",
  text: "Partner advertisements are labeled and separate from your conversations. Links may open external sites.",
};
