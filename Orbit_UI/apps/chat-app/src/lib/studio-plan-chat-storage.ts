import type { PlanChatRunLogEntry } from "@/types";

const KEY_PREFIX = "orbit:studio-plan-chat:";

export type StoredPlanChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type StoredPlanChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  runLogs?: PlanChatRunLogEntry[];
};

export type StoredPlanChatState = {
  messages: StoredPlanChatMessage[];
  history: StoredPlanChatTurn[];
};

function isStoredPlanChatState(value: unknown): value is StoredPlanChatState {
  if (!value || typeof value !== "object") return false;
  const state = value as StoredPlanChatState;
  if (!Array.isArray(state.messages) || !Array.isArray(state.history)) return false;
  return (
    state.messages.every(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        typeof message.id === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        typeof message.timestamp === "number" &&
        (message.runLogs === undefined ||
          (Array.isArray(message.runLogs) &&
            message.runLogs.every(
              (entry) =>
                typeof entry === "object" &&
                entry !== null &&
                typeof entry.id === "string" &&
                typeof entry.at === "number" &&
                typeof entry.message === "string" &&
                (entry.level === "info" ||
                  entry.level === "active" ||
                  entry.level === "success" ||
                  entry.level === "error"),
            ))),
    ) &&
    state.history.every(
      (turn) =>
        typeof turn === "object" &&
        turn !== null &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string",
    )
  );
}

export function readStudioPlanChat(planId: string): StoredPlanChatState | null {
  if (typeof window === "undefined" || !planId.trim()) return null;
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${planId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredPlanChatState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStudioPlanChat(planId: string, state: StoredPlanChatState): void {
  if (typeof window === "undefined" || !planId.trim()) return;
  localStorage.setItem(`${KEY_PREFIX}${planId}`, JSON.stringify(state));
}
