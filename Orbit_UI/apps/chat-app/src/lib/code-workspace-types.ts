export type CodeWorkspaceNodeKind = "folder" | "file";

/** Persisted tree node — structure metadata only (no file body). */
export type CodeWorkspaceNode = {
  id: string;
  kind: CodeWorkspaceNodeKind;
  name: string;
  parentId: string | null;
  language?: string | null;
};

/** In-memory file contents keyed by file node id (never persisted). */
export type CodeWorkspaceFileContents = Record<string, string>;

export type CodeWorkspaceUiState = {
  /** Single explorer selection: null = project root, otherwise a folder or file id. */
  explorerFocusId: string | null;
  activeFileId: string | null;
  /** Whether top-level project tree children are visible. */
  rootExpanded: boolean;
  expandedFolderIds: string[];
  /** Single editor tab (VS Code–style one open file). */
  openFileIds: string[];
};

export type CodeWorkspaceState = {
  nodes: CodeWorkspaceNode[];
  ui: CodeWorkspaceUiState;
};

export type CodeWorkspaceProject = {
  id: string;
  title: string;
  description?: string | null;
  updatedAt: number;
  state: CodeWorkspaceState;
};

export type CodeWorkspaceTreeItem = {
  node: CodeWorkspaceNode;
  children: CodeWorkspaceTreeItem[];
};
