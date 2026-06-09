import { CODE_PROJECT_NAME, CODE_WORKSPACE_FILES } from "@/lib/code-workspace-demo";
import { inferLanguageFromPath } from "@/lib/code-workspace-tree";
import type {
  CodeWorkspaceFileContents,
  CodeWorkspaceNode,
  CodeWorkspaceProject,
  CodeWorkspaceState,
  CodeWorkspaceTreeItem,
  CodeWorkspaceUiState,
} from "@/lib/code-workspace-types";
import type { ApiCodeWorkspaceProjectResponse } from "@/lib/orbit-api";

export const DEFAULT_UI_STATE: CodeWorkspaceUiState = {
  explorerFocusId: null,
  activeFileId: null,
  expandedFolderIds: [],
  openFileIds: [],
};

export function getCreateParentId(
  explorerFocusId: string | null,
  nodes: CodeWorkspaceNode[],
): string | null {
  if (explorerFocusId === null) return null;

  const node = nodes.find((item) => item.id === explorerFocusId);
  if (!node) return null;
  if (node.kind === "folder") return node.id;
  return node.parentId;
}

export function isExplorerFocused(nodeId: string, explorerFocusId: string | null): boolean {
  return explorerFocusId === nodeId;
}

export function isRootExplorerFocus(explorerFocusId: string | null): boolean {
  return explorerFocusId === null;
}

function migrateUiState(ui: CodeWorkspaceUiState & { selectedFolderId?: string | null }): CodeWorkspaceUiState {
  const explorerFocusId =
    ui.explorerFocusId ?? ui.selectedFolderId ?? DEFAULT_UI_STATE.explorerFocusId;
  const openFileIds =
    ui.openFileIds.length > 1 && ui.activeFileId
      ? [ui.activeFileId]
      : ui.openFileIds.length > 0
        ? [ui.openFileIds[0]]
        : ui.openFileIds;

  return {
    explorerFocusId,
    activeFileId: ui.activeFileId,
    expandedFolderIds: ui.expandedFolderIds ?? [],
    openFileIds,
  };
}

export function ancestorFolderIds(nodeId: string, nodes: CodeWorkspaceNode[]): string[] {
  const ids: string[] = [];
  let current = nodes.find((node) => node.id === nodeId);

  while (current?.parentId) {
    ids.push(current.parentId);
    current = nodes.find((node) => node.id === current?.parentId);
  }

  return ids;
}

export function nodePath(nodeId: string, nodes: CodeWorkspaceNode[]): string {
  const parts: string[] = [];
  let current = nodes.find((node) => node.id === nodeId);

  while (current) {
    parts.unshift(current.name);
    current = current.parentId
      ? nodes.find((node) => node.id === current?.parentId)
      : undefined;
  }

  return parts.join("/");
}

export function getChildren(
  parentId: string | null,
  nodes: CodeWorkspaceNode[],
): CodeWorkspaceNode[] {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
}

export function buildTree(nodes: CodeWorkspaceNode[], parentId: string | null = null): CodeWorkspaceTreeItem[] {
  return getChildren(parentId, nodes).map((node) => ({
    node,
    children: node.kind === "folder" ? buildTree(nodes, node.id) : [],
  }));
}

export function nodesForPersistence(nodes: CodeWorkspaceNode[]): CodeWorkspaceNode[] {
  return nodes.map((node) =>
    node.kind === "file"
      ? {
          id: node.id,
          kind: node.kind,
          name: node.name,
          parentId: node.parentId,
          language: node.language ?? null,
        }
      : {
          id: node.id,
          kind: node.kind,
          name: node.name,
          parentId: node.parentId,
        },
  );
}

export function buildInitialFileContents(nodes: CodeWorkspaceNode[]): CodeWorkspaceFileContents {
  const contents: CodeWorkspaceFileContents = {};

  for (const node of nodes) {
    if (node.kind !== "file") continue;
    const path = nodePath(node.id, nodes);
    contents[node.id] = CODE_WORKSPACE_FILES[path]?.content ?? "";
  }

  return contents;
}

export function mergeFileContentsForNodes(
  previous: CodeWorkspaceFileContents,
  nodes: CodeWorkspaceNode[],
): CodeWorkspaceFileContents {
  const next = { ...previous };

  for (const node of nodes) {
    if (node.kind === "file" && !(node.id in next)) {
      const path = nodePath(node.id, nodes);
      next[node.id] = CODE_WORKSPACE_FILES[path]?.content ?? "";
    }
  }

  return next;
}

export function getActiveFile(
  nodes: CodeWorkspaceNode[],
  activeFileId: string | null,
): CodeWorkspaceNode | undefined {
  if (!activeFileId) return undefined;
  return nodes.find((node) => node.id === activeFileId && node.kind === "file");
}

export function inferLanguageForName(name: string): string {
  return inferLanguageFromPath(name);
}

export function normalizeProjectState(state: CodeWorkspaceState): CodeWorkspaceState {
  return {
    nodes: nodesForPersistence(state.nodes),
    ui: migrateUiState({
      ...DEFAULT_UI_STATE,
      ...state.ui,
      expandedFolderIds: state.ui.expandedFolderIds ?? [],
      openFileIds: state.ui.openFileIds ?? [],
    }),
  };
}

const LOCAL_DEMO_NODES: CodeWorkspaceNode[] = [
  { id: "folder-src", kind: "folder", name: "src", parentId: null },
  { id: "file-client", kind: "file", name: "client.ts", parentId: "folder-src", language: "typescript" },
  { id: "file-factory", kind: "file", name: "factory.ts", parentId: "folder-src", language: "typescript" },
  { id: "file-rate", kind: "file", name: "rate-limiter.ts", parentId: "folder-src", language: "typescript" },
  { id: "file-types", kind: "file", name: "types.ts", parentId: "folder-src", language: "typescript" },
  { id: "file-utils", kind: "file", name: "utils.ts", parentId: "folder-src", language: "typescript" },
  { id: "file-index", kind: "file", name: "index.ts", parentId: null, language: "typescript" },
  { id: "file-package", kind: "file", name: "package.json", parentId: null, language: "json" },
  { id: "file-tsconfig", kind: "file", name: "tsconfig.json", parentId: null, language: "json" },
  { id: "file-readme", kind: "file", name: "README.md", parentId: null, language: "markdown" },
];

export function buildLocalDemoProject(): CodeWorkspaceProject {
  return {
    id: "local-demo",
    title: CODE_PROJECT_NAME,
    updatedAt: Date.now(),
    state: normalizeProjectState({
      nodes: LOCAL_DEMO_NODES,
      ui: {
        explorerFocusId: null,
        activeFileId: "file-client",
        expandedFolderIds: ["folder-src"],
        openFileIds: ["file-client"],
      },
    }),
  };
}

export function mapApiProject(raw: ApiCodeWorkspaceProjectResponse): CodeWorkspaceProject {
  const ui = raw.state.ui;
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    updatedAt: raw.updatedAt,
    state: normalizeProjectState({
      nodes: raw.state.nodes,
      ui: {
        explorerFocusId: ui.explorerFocusId ?? ui.selectedFolderId ?? null,
        activeFileId: ui.activeFileId,
        expandedFolderIds: ui.expandedFolderIds,
        openFileIds: ui.openFileIds,
      },
    }),
  };
}

function validateParent(nodes: CodeWorkspaceNode[], parentId: string | null): string | null {
  if (parentId === null) return null;
  const parent = nodes.find((node) => node.id === parentId);
  if (!parent) return "Parent folder not found.";
  if (parent.kind !== "folder") return "Parent must be a folder.";
  return null;
}

function validateUniqueName(
  nodes: CodeWorkspaceNode[],
  name: string,
  parentId: string | null,
): string | null {
  const normalized = name.trim();
  if (!normalized) return "Name is required.";
  const duplicate = nodes.some(
    (node) => node.parentId === parentId && node.name === normalized,
  );
  return duplicate ? "Name already exists in folder." : null;
}

export function addLocalNode(
  state: CodeWorkspaceState,
  input: {
    kind: "folder" | "file";
    name: string;
    parentId: string | null;
    language?: string;
  },
): { state: CodeWorkspaceState; nodeId: string; error: string | null } {
  const parentError = validateParent(state.nodes, input.parentId);
  if (parentError) return { state, nodeId: "", error: parentError };

  const nameError = validateUniqueName(state.nodes, input.name, input.parentId);
  if (nameError) return { state, nodeId: "", error: nameError };

  const nodeId = crypto.randomUUID();
  const node: CodeWorkspaceNode = {
    id: nodeId,
    kind: input.kind,
    name: input.name.trim(),
    parentId: input.parentId,
    language: input.kind === "file" ? input.language ?? inferLanguageForName(input.name) : null,
  };

  const expanded = new Set(state.ui.expandedFolderIds);
  if (input.parentId) expanded.add(input.parentId);

  const nextUi = { ...state.ui };
  nextUi.explorerFocusId = nodeId;
  if (input.kind === "folder") {
    expanded.add(nodeId);
    nextUi.expandedFolderIds = [...expanded];
  } else {
    nextUi.activeFileId = nodeId;
    nextUi.openFileIds = [nodeId];
    if (input.parentId) nextUi.expandedFolderIds = [...expanded];
  }

  return {
    state: {
      nodes: [...state.nodes, node],
      ui: nextUi,
    },
    nodeId,
    error: null,
  };
}

export function applyProjectState(project: CodeWorkspaceProject, state: CodeWorkspaceState): CodeWorkspaceProject {
  return { ...project, state: normalizeProjectState(state) };
}
