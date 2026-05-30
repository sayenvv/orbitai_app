"use client";

import { useEffect, useState } from "react";
import { libraryItems, type LibraryItem } from "@/lib/home-data";
import { publicApi, type GeneratedMaterial } from "@/lib/orbit-api";
import { useAgents } from "@/hooks/use-agents";

function agentMetaForSource(
  source: string,
  agents: ReturnType<typeof useAgents>["agents"],
): Pick<GeneratedMaterial, "agentSlug" | "agentName" | "iconKey" | "colorKey"> {
  const match = agents.find(
    (a) =>
      a.name === source ||
      a.shortName === source ||
      source.toLowerCase().includes(a.shortName.toLowerCase()),
  );
  if (match) {
    return {
      agentSlug: match.id,
      agentName: match.name,
      iconKey: match.iconKey,
      colorKey: match.colorKey,
    };
  }
  return {
    agentSlug: "general-knowledge",
    agentName: source || "Clovai",
    iconKey: "Sparkles",
    colorKey: "indigo",
  };
}

function mapLibraryItem(
  item: LibraryItem,
  agents: ReturnType<typeof useAgents>["agents"],
): GeneratedMaterial {
  const meta = agentMetaForSource(item.source, agents);
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    date: item.date,
    ...meta,
  };
}

export function useGeneratedMaterials() {
  const { agents } = useAgents();
  const [materials, setMaterials] = useState<GeneratedMaterial[]>(() =>
    libraryItems.map((item) => mapLibraryItem(item, [])),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMaterials(libraryItems.map((item) => mapLibraryItem(item, agents)));
    publicApi
      .library()
      .then((res) => {
        const rows = res.data ?? [];
        if (rows.length > 0) {
          setMaterials(
            rows.map((row, index) => {
              const r = row as Record<string, string>;
              const source = r.source ?? r.agent_name ?? "Clovai";
              const meta = agentMetaForSource(source, agents);
              return {
                id: r.id ?? `lib-${index}`,
                title: r.title ?? r.name ?? "Untitled",
                type: r.type ?? "Generated",
                date: r.date ?? r.created_at ?? "",
                ...meta,
              };
            }),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agents]);

  return { materials, loading };
}
