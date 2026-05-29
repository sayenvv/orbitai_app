"use client";

import { useEffect, useState } from "react";
import { buildHomeAgent } from "@/lib/agent-display";
import { publicApi, type ApiAgent } from "@/lib/orbit-api";
import { agents as fallbackAgents, type HomeAgent } from "@/lib/home-data";

function mapApiAgent(raw: ApiAgent): HomeAgent {
  return buildHomeAgent({
    id: raw.slug,
    name: raw.name,
    shortName: raw.short_name,
    description: raw.description,
    iconKey: raw.icon_key,
    colorKey: raw.color_key,
  });
}

export function useAgents() {
  const [agents, setAgents] = useState<HomeAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi
      .agents()
      .then((res) => {
        if (res.data?.length) {
          setAgents(res.data.map(mapApiAgent));
        } else {
          setAgents(fallbackAgents);
        }
      })
      .catch(() => {
        setAgents(fallbackAgents);
      })
      .finally(() => setLoading(false));
  }, []);

  return { agents, loading };
}
