"use client";

import { ArrowUpRight } from "lucide-react";

import { getAgentSuggestions } from "@/lib/agent-suggestions";
import { cn } from "@/lib/utils";

type AgentSuggestionsProps = {
  agentSlug: string;
  onSelect: (prompt: string) => void;
  className?: string;
};

export function AgentSuggestions({ agentSlug, onSelect, className }: AgentSuggestionsProps) {
  const suggestions = getAgentSuggestions(agentSlug);

  return (
    <section className={cn("w-full", className)} aria-label="Suggested prompts">
      <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
        Suggestions
      </p>
      <ul className="flex flex-col gap-1.5">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <button
              type="button"
              onClick={() => onSelect(suggestion.prompt)}
              className="group flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border/60 hover:bg-muted/40"
            >
              <span className="text-[13px] leading-snug text-muted-foreground transition-colors group-hover:text-foreground">
                {suggestion.label}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
