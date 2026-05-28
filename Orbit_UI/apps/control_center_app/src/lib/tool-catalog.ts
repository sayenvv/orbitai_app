/**
 * Backwards-compatible re-exports.
 * The canonical tool catalog now lives in `@/lib/data` (driven by JSON).
 */
import type { Agent } from "@/lib/data";
import { getToolsForAgent } from "@/lib/data";

export type { ToolDefinition } from "@/lib/data";
export { listTools, getToolById, getToolsForAgent, getToolIdsForAgent } from "@/lib/data";

/** @deprecated Use `getToolsForAgent(agentId)` from `@/lib/data` instead. */
export function getDefaultToolsForAgent(agent: Agent) {
  return getToolsForAgent(agent.id);
}
