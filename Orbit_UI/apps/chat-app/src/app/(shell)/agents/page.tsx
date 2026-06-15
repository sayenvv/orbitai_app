"use client";

import { useEffect } from "react";

import { StudioAgentsPage } from "@/components/agents/studio-agents-page";
import { useAppShell } from "@/components/layout/app-shell-context";

export default function AgentsPage() {
  const { setHeader } = useAppShell();

  useEffect(() => {
    setHeader({
      title: "Agents",
      subtitle: "Design, planning, and development workflows",
    });
    return () => setHeader(null);
  }, [setHeader]);

  return <StudioAgentsPage />;
}
