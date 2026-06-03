import { detectCodeLanguage } from "@/lib/prism-setup";

const FENCE_ALIAS: Record<string, string> = {
  css: "css",
  stylesheet: "css",
  style: "css",
  styles: "css",
  scss: "scss",
  sass: "scss",
  html: "html",
  xml: "html",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  python: "python",
  py: "python",
  json: "json",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  sql: "sql",
};

function normalizeFenceLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  return FENCE_ALIAS[key] ?? key;
}

/**
 * Ensure fenced blocks have a language tag so ReactMarkdown → Prism highlights correctly.
 */
export function normalizeAssistantMarkdown(content: string): string {
  if (!content.includes("```")) return content;

  return content.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_full, info: string, body: string) => {
    const trimmed = info.trim();
    const lang = trimmed ? normalizeFenceLabel(trimmed) : detectCodeLanguage(body);
    const safeLang = lang === "text" ? "" : lang;
    return safeLang ? `\`\`\`${safeLang}\n${body}\`\`\`` : `\`\`\`\n${body}\`\`\``;
  });
}
