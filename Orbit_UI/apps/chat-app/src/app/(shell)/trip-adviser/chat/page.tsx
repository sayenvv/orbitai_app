"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  ArrowLeft,
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  MapPin,
  Calendar,
  Star,
  ChevronRight,
  Compass,
  BookmarkPlus,
  ExternalLink,
  Sun,
  Mountain,
  Building2,
  TreePalm,
  Wallet,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type TripSource = "TripAdvisor" | "Booking.com" | "Airbnb" | "Expedia" | "Kayak" | "MakeMyTrip";

const sourceConfig: Record<TripSource, { color: string; dot: string }> = {
  TripAdvisor: { color: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10", dot: "bg-emerald-500" },
  "Booking.com": { color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10", dot: "bg-blue-500" },
  Airbnb: { color: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10", dot: "bg-rose-500" },
  Expedia: { color: "text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10", dot: "bg-yellow-500" },
  Kayak: { color: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10", dot: "bg-orange-500" },
  MakeMyTrip: { color: "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10", dot: "bg-red-500" },
};

type TripCategory = "Beach" | "Mountain" | "City" | "Adventure" | "Cultural";

const categoryIcon: Record<TripCategory, typeof Sun> = {
  Beach: TreePalm,
  Mountain: Mountain,
  City: Building2,
  Adventure: Compass,
  Cultural: Sparkles,
};

interface TripCard {
  id: string;
  destination: string;
  country: string;
  emoji: string;
  category: TripCategory;
  bestTime: string;
  duration: string;
  pricePerPerson: string;
  rating: number;
  highlights: string[];
  source: TripSource;
  featured?: boolean;
}

const sampleTrips: TripCard[] = [
  {
    id: "1",
    destination: "Bali",
    country: "Indonesia",
    emoji: "🌴",
    category: "Beach",
    bestTime: "Apr – Oct",
    duration: "5–7 days",
    pricePerPerson: "$850",
    rating: 4.8,
    highlights: ["Ubud rice terraces", "Seminyak beaches", "Mount Batur sunrise"],
    source: "TripAdvisor",
    featured: true,
  },
  {
    id: "2",
    destination: "Kyoto",
    country: "Japan",
    emoji: "⛩️",
    category: "Cultural",
    bestTime: "Mar – May",
    duration: "4–6 days",
    pricePerPerson: "$1,420",
    rating: 4.9,
    highlights: ["Fushimi Inari", "Arashiyama bamboo", "Gion district"],
    source: "Booking.com",
    featured: true,
  },
  {
    id: "3",
    destination: "Swiss Alps",
    country: "Switzerland",
    emoji: "🏔️",
    category: "Mountain",
    bestTime: "Jun – Sep",
    duration: "6–8 days",
    pricePerPerson: "$2,100",
    rating: 4.9,
    highlights: ["Jungfrau region", "Zermatt & Matterhorn", "Glacier Express"],
    source: "Expedia",
  },
];

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  trips?: TripCard[];
  insights?: { label: string; value: string }[];
}

const quickPrompts = [
  { icon: TreePalm, label: "Best beach destinations under $1000 for 5 days" },
  { icon: Mountain, label: "Plan a 7-day Swiss Alps trip in summer" },
  { icon: Building2, label: "Top weekend city breaks in Europe" },
  { icon: Compass, label: "Adventure trips for solo travelers" },
];

export default function TripAdviserChatPage() {
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
        content: `Here are ${sampleTrips.length} hand-picked destinations matching "${trimmed}" — prices and ratings aggregated from leading travel sites:`,
        trips: sampleTrips,
        insights: [
          { label: "Avg price", value: "$1,457" },
          { label: "Avg rating", value: "4.87 ★" },
          { label: "Sources", value: "3 sites" },
        ],
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);
    }, 900);
  };

  const exploreAll = () => {
    // No standalone explore page yet; surface a follow-up prompt instead
    sendMessage("Show me more destination ideas with full itineraries");
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
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-rose-600">
                <Plane className="h-4 w-4 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-background animate-pulse" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold">Trip Adviser</h1>
              <p className="text-[10px] text-muted-foreground">AI agent · destinations, hotels & itineraries</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendMessage("Build me a 7-day trip plan with day-by-day itinerary")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Plan itinerary</span>
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
          <div className="flex gap-2 items-end rounded-2xl border border-border/40 bg-card/60 px-3 py-2 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm">
            <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mb-2" />
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
              placeholder="Where do you want to go? Tell me about your dream trip..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 resize-none max-h-32 py-1.5 min-w-0"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-rose-600 text-white hover:shadow-md hover:shadow-orange-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">
            Prices and availability are estimates · always confirm on the source site
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
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 shadow-lg shadow-orange-500/30">
          <Plane className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-orange-600 bg-clip-text text-transparent">
          Trip Adviser
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tell me your dates, budget, and vibe. I&apos;ll suggest destinations, build itineraries, and find stays from TripAdvisor, Booking.com, Airbnb & more.
        </p>
      </div>

      {/* Source chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(sourceConfig) as TripSource[]).map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sourceConfig[s].dot}`} />
            {s}
          </span>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(categoryIcon) as TripCategory[]).map((cat) => {
          const Icon = categoryIcon[cat];
          return (
            <button
              key={cat}
              onClick={() => onPrompt(`Suggest top ${cat.toLowerCase()} destinations for next month`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 px-3 py-1 text-[11px] font-semibold text-orange-700 dark:text-orange-400 transition-colors"
            >
              <Icon className="h-3 w-3" />
              {cat}
            </button>
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
              className="group text-left rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all"
            >
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500/20 transition-colors">
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
          isUser ? "bg-muted" : "bg-gradient-to-br from-orange-500 to-rose-600"
        }`}
      >
        {isUser ? <UserIcon className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-white" />}
      </div>

      <div className={`flex-1 max-w-[85%] space-y-3 ${isUser ? "flex flex-col items-end" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-orange-500 to-rose-600 text-white rounded-tr-sm"
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
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{ins.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Trip cards */}
        {msg.trips && msg.trips.length > 0 && (
          <div className="space-y-2 w-full">
            {msg.trips.map((trip) => (
              <TripResultCard key={trip.id} trip={trip} />
            ))}

            {/* Explore more CTA */}
            <button
              onClick={onExplore}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/60 px-4 py-3 text-sm font-semibold text-orange-700 dark:text-orange-400 transition-all"
            >
              <Compass className="h-4 w-4" />
              See more destination ideas
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TripResultCard({ trip }: { trip: TripCard }) {
  const src = sourceConfig[trip.source];
  const CatIcon = categoryIcon[trip.category];
  return (
    <div className="group relative rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3 hover:border-orange-500/40 hover:shadow-md transition-all">
      {trip.featured && (
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-2 py-0.5">
          <Star className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 fill-current" />
          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Top pick</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-rose-600/20 border border-orange-500/20 flex items-center justify-center text-2xl">
          {trip.emoji}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <h4 className="font-semibold text-sm leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              {trip.destination}, {trip.country}
            </h4>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-1.5 py-0 text-[9px] font-semibold text-orange-700 dark:text-orange-400">
                <CatIcon className="h-2.5 w-2.5" />
                {trip.category}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-medium ${src.color}`}>
                <span className={`h-1 w-1 rounded-full ${src.dot}`} />
                {trip.source}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {trip.bestTime}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {trip.duration}
            </span>
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {trip.pricePerPerson} / person
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-current" />
              {trip.rating}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 pt-0.5">
            {trip.highlights.map((h) => (
              <span key={h} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" />
                {h}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1.5">
            <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline">
              View itinerary
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
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center">
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
