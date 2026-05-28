import { notFound } from "next/navigation";
import { getAgentByIdOrSlug, type Agent } from "@/lib/data";

/**
 * Helper for `[agentId]` server pages. Awaits the params promise, resolves the
 * agent by UUID or slug, and 404s if missing — collapses 3 lines of boilerplate
 * to a single call.
 */
export async function loadAgent(
  params: Promise<{ agentId: string }>
): Promise<Agent> {
  const { agentId } = await params;
  const agent = getAgentByIdOrSlug(agentId);
  if (!agent) notFound();
  return agent;
}
