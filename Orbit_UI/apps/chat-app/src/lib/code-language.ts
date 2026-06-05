const LANG_ALIASES: Record<string, string> = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  md: "markdown",
};

export function detectCodeLanguage(code: string): string {
  const sample = code.slice(0, 2000).trim();
  if (!sample) return "text";

  if (/^\s*(import |from |def |class |async def |#)/m.test(sample)) return "python";
  if (/^\s*(const |let |var |function |export |import )/m.test(sample)) {
    return /:\s*\w+|interface |type /m.test(sample) ? "typescript" : "javascript";
  }
  if (/^\s*(\{|\[|"[\w-]+"\s*:)/m.test(sample)) return "json";
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)\b/im.test(sample)) return "sql";
  if (/^\s*<!DOCTYPE|<html|<div/i.test(sample)) return "html";
  if (/^\s*(\.|#)[\w-]+\s*\{/m.test(sample)) return "css";

  return "text";
}

export function toShikiLanguage(tag: string | undefined, code: string): string {
  const raw = (tag ?? "").trim().toLowerCase();
  if (!raw) return detectCodeLanguage(code);
  return LANG_ALIASES[raw] ?? raw;
}
