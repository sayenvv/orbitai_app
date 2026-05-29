"use client";

import { useQuery } from "@tanstack/react-query";
import { controlApi, mapControlAgent } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";
import type { Agent } from "@/lib/data";

export function useControlAgents() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["control", "agents"],
    queryFn: async (): Promise<Agent[]> => {
      const rows = await controlApi.listAgents();
      return rows.map(mapControlAgent);
    },
    enabled: isAuthenticated,
  });
}

export function useControlAgent(agentId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["control", "agents", agentId],
    queryFn: async (): Promise<Agent> => {
      const row = await controlApi.getAgent(agentId);
      return mapControlAgent(row);
    },
    enabled: isAuthenticated && Boolean(agentId),
  });
}
