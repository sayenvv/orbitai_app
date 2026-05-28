/**
 * Backwards-compatible re-exports.
 * The data layer now lives in `@/lib/data` — prefer importing from there.
 */
import { listAgents, getAgentByIdOrSlug } from "@/lib/data";

export type { Agent } from "@/lib/data";
export {
  getAgentById,
  getAgentBySlug,
  getAgentByIdOrSlug,
  DEFAULT_AGENT_ID,
  DEFAULT_AGENT_SLUG,
} from "@/lib/data";

/** Snapshot list of all agents. Equivalent to `listAgents()`. */
export const AGENTS = listAgents();

/**
 * Resolve an agent by either its UUID `id` or its human-readable `slug`.
 * Routes whose `[agentId]` param may carry either continue to work.
 */
export const getAgent = getAgentByIdOrSlug;
