import { notFound } from "next/navigation";
import { fetchAgent } from "@/lib/control-api-server";
import { ApiError } from "@/lib/orbit-api";
import type { Agent } from "@/lib/data";

/**
 * Helper for `[agentId]` server pages. Awaits the params promise, loads the
 * agent from the control API (UUID or slug), and 404s if missing.
 */
export async function loadAgent(
  params: Promise<{ agentId: string }>,
): Promise<Agent> {
  const { agentId } = await params;
  try {
    return await fetchAgent(agentId);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 401 || err.status === 403)) {
      notFound();
    }
    throw err;
  }
}
