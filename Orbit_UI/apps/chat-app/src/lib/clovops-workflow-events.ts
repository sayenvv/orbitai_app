import type { CodeWorkspaceAgentStreamEvent } from "@/lib/orbit-api";
import { randomId } from "@/lib/utils";

export type WorkflowEventStatus = "info" | "running" | "success" | "error" | "warning";
export type WorkflowEventCategory =
  | "task"
  | "tool"
  | "plan"
  | "routing"
  | "background"
  | "validation"
  | "review";

export type ApiCodeWorkspaceWorkflowEvent = {
  id: string;
  kind: string;
  title: string;
  message?: string | null;
  detail?: string | null;
  agentId?: string | null;
  status: WorkflowEventStatus;
  category: WorkflowEventCategory;
  meta?: Record<string, unknown>;
};

export type WorkflowRoutingMeta = {
  requestType?: string | null;
  pipeline?: string[];
  reason?: string | null;
};

function mapStreamEvent(event: CodeWorkspaceAgentStreamEvent): ApiCodeWorkspaceWorkflowEvent[] {
  switch (event.type) {
    case "workflow":
      return [
        {
          id: event.id,
          kind: event.kind,
          title: event.title,
          message: event.message,
          detail: event.detail,
          agentId: event.agentId,
          status: event.status,
          category: event.category,
          meta: event.meta,
        },
      ];
    case "start":
      return [
        {
          id: "run-started",
          kind: "run_started",
          title: "Workflow started",
          message: event.resumed ? "Resuming after review" : "Analyzing request",
          status: "running",
          category: "background",
        },
      ];
    case "routing":
      return [
        {
          id: "routing-decision",
          kind: "routing",
          title: "Request routed",
          message: `${event.request_type}${event.reason ? ` · ${event.reason}` : ""}`,
          status: "info",
          category: "routing",
          meta: {
            requestType: event.request_type,
            pipeline: event.pipeline || [],
            reason: event.reason,
          },
        },
      ];
    case "phase":
      if (event.status === "running") {
        return [
          {
            id: `task-${event.phase}-active`,
            kind: "step_start",
            title: event.phase.replace(/_/g, " "),
            message: event.message,
            agentId: event.phase,
            status: "running",
            category: "task",
          },
        ];
      }
      if (event.status === "done") {
        return [
          {
            id: `task-${event.phase}-active`,
            kind: "step_done",
            title: event.phase.replace(/_/g, " "),
            message: event.message,
            agentId: event.phase,
            status: "success",
            category: "task",
          },
        ];
      }
      return [];
    case "log":
      if (event.status === "error") {
        return [
          {
            id: event.id || randomId(),
            kind: "step_error",
            title: event.agent,
            message: event.message,
            detail: event.detail ?? undefined,
            agentId: event.agentId,
            status: "error",
            category: "task",
          },
        ];
      }
      return [];
    case "terminal":
      return [
        {
          id: `tool-terminal-${event.command}`,
          kind: "tool_result",
          title: "Terminal",
          message: event.command,
          detail: event.output || undefined,
          agentId: event.agent || "executor",
          status:
            event.exitCode != null && event.exitCode !== 0
              ? "error"
              : event.output
                ? "success"
                : "running",
          category: "tool",
          meta: {
            tool: "terminal",
            exitCode: event.exitCode,
            executed: event.executed,
            purpose: event.purpose,
            planKind: event.planKind,
            planCycle: event.planCycle,
          },
        },
      ];
    case "edit":
      return [
        {
          id: `tool-write-${event.edit.fileId}`,
          kind: "tool_result",
          title: "Write file",
          message: event.edit.filePath,
          detail: event.edit.created ? "Created file" : "Updated file",
          agentId: "write_code",
          status: "success",
          category: "tool",
          meta: { tool: "write_file", created: event.edit.created },
        },
      ];
    case "files":
      return [
        {
          id: "tool-search-results",
          kind: "search_results",
          title: "Search files",
          message: `${event.files.length} relevant file${event.files.length === 1 ? "" : "s"}`,
          status: "success",
          category: "tool",
          meta: { tool: "search_files", count: event.files.length },
        },
      ];
    case "review":
      return [
        {
          id: `review-${event.review.fileId}`,
          kind: "review",
          title: "Code review",
          message: event.review.filePath,
          detail: event.review.summary,
          agentId: "review_code",
          status: event.review.passed ? "success" : "warning",
          category: "review",
          meta: { passed: event.review.passed, issueCount: event.review.issues.length },
        },
      ];
    case "validation":
      return [
        {
          id: "validation-result",
          kind: "validation",
          title: "Validation",
          message: event.validation.passed ? "All checks passed" : "Issues found",
          detail: event.validation.issues
            .slice(0, 5)
            .map((issue) => `L${issue.line}: ${issue.message}`)
            .join("; "),
          agentId: "validate_code",
          status: event.validation.passed ? "success" : "error",
          category: "validation",
          meta: {
            passed: event.validation.passed,
            checks: event.validation.checks,
            issueCount: event.validation.issues.length,
          },
        },
      ];
    case "await_human":
      return [
        {
          id: "await-human",
          kind: "await_human",
          title: "Plan review required",
          message: event.human_prompt,
          detail: event.plan || event.discussion || undefined,
          agentId: event.pending_agent,
          status: "warning",
          category: "plan",
          meta: {
            plan: event.plan,
            discussion: event.discussion,
          },
        },
      ];
    case "error":
      return [
        {
          id: randomId(),
          kind: "run_error",
          title: "Workflow error",
          message: event.detail,
          status: "error",
          category: "background",
        },
      ];
    case "done":
      return [
        {
          id: "run-completed",
          kind: "run_completed",
          title: "Workflow completed",
          message: event.content?.slice(0, 240) || "Done",
          status: "success",
          category: "background",
          meta: {
            requestType: event.request_type,
            pipeline: event.pipeline || [],
          },
        },
      ];
    default:
      return [];
  }
}

export function upsertWorkflowEvent(
  events: ApiCodeWorkspaceWorkflowEvent[],
  incoming: ApiCodeWorkspaceWorkflowEvent,
): ApiCodeWorkspaceWorkflowEvent[] {
  const index = events.findIndex((event) => event.id === incoming.id);
  if (index >= 0) {
    return events.map((event, idx) => (idx === index ? { ...event, ...incoming } : event));
  }
  return [...events, incoming];
}

export function appendWorkflowEventsFromStream(
  events: ApiCodeWorkspaceWorkflowEvent[],
  streamEvent: CodeWorkspaceAgentStreamEvent,
): ApiCodeWorkspaceWorkflowEvent[] {
  let next = events;
  for (const mapped of mapStreamEvent(streamEvent)) {
    next = upsertWorkflowEvent(next, mapped);
  }
  return next;
}

export function finalizeWorkflowEvents(
  events: ApiCodeWorkspaceWorkflowEvent[],
): ApiCodeWorkspaceWorkflowEvent[] {
  return events.map((event) =>
    event.status === "running" ? { ...event, status: "success" as const } : event,
  );
}

export function extractRoutingMeta(
  events: ApiCodeWorkspaceWorkflowEvent[],
): WorkflowRoutingMeta | null {
  const routing = events.find((event) => event.kind === "routing");
  if (!routing?.meta) return null;
  return {
    requestType: routing.meta.requestType as string | null | undefined,
    pipeline: (routing.meta.pipeline as string[]) || [],
    reason: routing.meta.reason as string | null | undefined,
  };
}

export function filterWorkflowByCategory(
  events: ApiCodeWorkspaceWorkflowEvent[],
  category: WorkflowEventCategory | "tools",
): ApiCodeWorkspaceWorkflowEvent[] {
  if (category === "tools") {
    return events.filter((event) => event.category === "tool");
  }
  return events.filter((event) => event.category === category);
}

export function collapseTaskEvents(
  events: ApiCodeWorkspaceWorkflowEvent[],
): ApiCodeWorkspaceWorkflowEvent[] {
  const taskEvents = events.filter((event) => event.category === "task");
  const latestByAgent = new Map<string, ApiCodeWorkspaceWorkflowEvent>();
  const order: string[] = [];
  for (const event of taskEvents) {
    const key = event.agentId || event.id;
    latestByAgent.set(key, event);
    if (!order.includes(key)) order.push(key);
  }
  return order
    .map((key) => latestByAgent.get(key))
    .filter((event): event is ApiCodeWorkspaceWorkflowEvent => Boolean(event));
}
