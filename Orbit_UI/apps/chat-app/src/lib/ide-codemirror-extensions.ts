import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import type { Extension } from "@codemirror/state";

export function getIdeCodeMirrorLanguage(language: string): Extension[] {
  const normalized = language.trim().toLowerCase();

  switch (normalized) {
    case "python":
    case "py":
      return [python()];
    case "typescript":
    case "ts":
      return [javascript({ typescript: true })];
    case "javascript":
    case "js":
    case "jsx":
      return [javascript({ jsx: true, typescript: false })];
    case "json":
    case "jsonc":
      return [json()];
    case "markdown":
    case "md":
    case "mdx":
      return [markdown()];
    case "html":
    case "htm":
      return [html()];
    case "css":
    case "scss":
    case "less":
      return [css()];
    case "rust":
    case "rs":
      return [rust()];
    case "java":
    case "kt":
    case "kotlin":
      return [java()];
    case "cpp":
    case "c":
    case "h":
    case "hpp":
    case "cc":
      return [cpp()];
    case "php":
      return [php()];
    case "sql":
      return [sql()];
    case "xml":
      return [xml()];
    case "go":
      return [go()];
    default:
      return [];
  }
}
