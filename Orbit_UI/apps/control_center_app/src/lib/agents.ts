/**
 * Agent types and API-backed accessors.
 * Prefer `useControlAgents` / `useControlAgent` on the client and
 * `fetchAgent` / `loadAgent` in server components.
 */
export type { Agent, AgentRecord, AgentStatus } from "@/lib/data";
export { hydrateAgentRecord } from "@/lib/data";
export { fetchAgent, fetchAgents, fetchDefaultAgentId } from "@/lib/control-api-server";
export { loadAgent } from "@/lib/agent-page";
