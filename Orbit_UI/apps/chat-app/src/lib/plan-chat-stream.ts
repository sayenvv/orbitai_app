import type { PlanChatRunLogEntry } from "@/types";
import { randomId } from "@/lib/utils";

export type PlanChatLogLevel = "info" | "active" | "success" | "error";

export type PlanChatLogEntry = {
  id: string;
  at: number;
  level: PlanChatLogLevel;
  message: string;
};

export type ProjectPlanningAiAssistStage =
  | "read_brief"
  | "load_section"
  | "parse_request"
  | "generate_patch"
  | "apply_edits";

export type ProjectPlanningAiAssistStreamEvent = {
  type: "stage_start" | "stage_done" | "token" | "done" | "error";
  stage?: ProjectPlanningAiAssistStage;
  message?: string;
  content?: string;
  reply?: string;
  worksheet?: Record<string, unknown>;
  worksheetUpdated?: boolean;
};

export type ProjectPlanningAiAssistStreamResult = {
  reply: string;
  worksheet?: Record<string, unknown>;
  worksheetUpdated: boolean;
};

function createLog(level: PlanChatLogLevel, message: string): PlanChatLogEntry {
  return {
    id: randomId(),
    at: Date.now(),
    level,
    message,
  };
}

function settleActiveLog(logs: PlanChatLogEntry[], message?: string): PlanChatLogEntry[] {
  const next = [...logs];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index]?.level !== "active") continue;
    next[index] = {
      ...next[index],
      level: "success",
      message: message ?? next[index].message,
    };
    break;
  }
  return next;
}

export function applyPlanningAssistStreamEvent(
  logs: PlanChatLogEntry[],
  event: ProjectPlanningAiAssistStreamEvent,
): PlanChatLogEntry[] {
  if (event.type === "stage_start") {
    const settled = settleActiveLog(logs);
    return [
      ...settled,
      createLog("active", event.message ?? "Working…"),
    ];
  }

  if (event.type === "stage_done") {
    return settleActiveLog(logs, event.message);
  }

  if (event.type === "error") {
    const settled = settleActiveLog(logs);
    return [...settled, createLog("error", event.message ?? "Edit failed")];
  }

  return logs;
}

export function finalizePlanningAssistStreamLogs(logs: PlanChatLogEntry[]): PlanChatRunLogEntry[] {
  const settled = settleActiveLog(logs);
  if (settled.some((entry) => entry.message === "Done")) {
    return settled as PlanChatRunLogEntry[];
  }
  return [...settled, createLog("success", "Done")] as PlanChatRunLogEntry[];
}
