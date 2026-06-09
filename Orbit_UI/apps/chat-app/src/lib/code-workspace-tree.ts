import type { CodeTreeNode } from "@/lib/code-workspace-demo";

export function flattenFilePaths(nodes: CodeTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === "file" ? [node.path] : flattenFilePaths(node.children),
  );
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  pyw: "python",
  pyi: "python",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  rb: "ruby",
  php: "php",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  html: "html",
  htm: "html",
  css: "css",
  scss: "css",
  less: "css",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  vue: "vue",
  svelte: "svelte",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  dart: "dart",
  lua: "lua",
  r: "r",
  toml: "toml",
  ini: "ini",
  dockerfile: "docker",
};

const FILENAME_LANGUAGE_MAP: Record<string, string> = {
  dockerfile: "docker",
  makefile: "makefile",
};

export function inferLanguageFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const lower = base.toLowerCase();

  const byName = FILENAME_LANGUAGE_MAP[lower];
  if (byName) return byName;

  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0) return "plaintext";

  const ext = base.slice(dotIndex + 1).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? "plaintext";
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required";
  if (trimmed.includes("/") || trimmed.includes("\\")) return "Name cannot contain slashes";
  if (trimmed === "." || trimmed === "..") return "Invalid name";
  return null;
}

function sortNodes(nodes: CodeTreeNode[]): CodeTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function getChildrenAt(tree: CodeTreeNode[], parentPath: string): CodeTreeNode[] {
  if (!parentPath) return tree;

  const segments = parentPath.split("/");
  let current = tree;

  for (const segment of segments) {
    const folder = current.find((node) => node.kind === "folder" && node.name === segment);
    if (!folder || folder.kind !== "folder") return [];
    current = folder.children;
  }

  return current;
}

function hasConflict(children: CodeTreeNode[], name: string): boolean {
  return children.some((node) => node.name === name);
}

function insertNode(
  tree: CodeTreeNode[],
  parentPath: string,
  node: CodeTreeNode,
): CodeTreeNode[] {
  if (!parentPath) {
    return sortNodes([...tree, node]);
  }

  const [head, ...rest] = parentPath.split("/");

  return tree.map((item) => {
    if (item.kind !== "folder" || item.name !== head) return item;

    const nextParent = rest.join("/");
    return {
      ...item,
      children: nextParent
        ? insertNode(item.children, nextParent, node)
        : sortNodes([...item.children, node]),
    };
  });
}

function resolvePath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

type TreeMutationResult =
  | { tree: CodeTreeNode[]; path: string }
  | { error: string };

export function addFileToTree(
  tree: CodeTreeNode[],
  parentPath: string,
  name: string,
): TreeMutationResult {
  const validationError = validateName(name);
  if (validationError) return { error: validationError };

  const fileName = name.trim();
  const children = getChildrenAt(tree, parentPath);
  if (hasConflict(children, fileName)) return { error: "Name already exists" };

  const path = resolvePath(parentPath, fileName);
  const newFile: CodeTreeNode = { kind: "file", name: fileName, path };

  return {
    tree: insertNode(tree, parentPath, newFile),
    path,
  };
}

export function addFolderToTree(
  tree: CodeTreeNode[],
  parentPath: string,
  name: string,
): TreeMutationResult {
  const validationError = validateName(name);
  if (validationError) return { error: validationError };

  const folderName = name.trim();
  const children = getChildrenAt(tree, parentPath);
  if (hasConflict(children, folderName)) return { error: "Name already exists" };

  const path = resolvePath(parentPath, folderName);
  const newFolder: CodeTreeNode = {
    kind: "folder",
    name: folderName,
    children: [],
  };

  return {
    tree: insertNode(tree, parentPath, newFolder),
    path,
  };
}
