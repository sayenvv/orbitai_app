/**
 * Backwards-compatible re-exports.
 * The canonical tool catalog now lives in `@/lib/data` (driven by JSON).
 */
export type { ToolDefinition } from "@/lib/data";
export { listTools, getToolById, getToolsForAgent, getToolIdsForAgent } from "@/lib/data";
