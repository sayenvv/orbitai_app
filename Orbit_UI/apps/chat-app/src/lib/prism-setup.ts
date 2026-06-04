const SUPPORTED = new Set([
  "bash",
  "css",
  "html",
  "javascript",
  "js",
  "json",
  "markup",
  "python",
  "scss",
  "sql",
  "typescript",
  "ts",
  "tsx",
  "jsx",
]);

/** No-op: full Prism build from react-syntax-highlighter already includes CSS and friends. */
export function ensurePrismLanguages() {
  return;
}

export function resolvePrismLanguage(tag: string | undefined, code: string): string {
  const normalized = (tag || "").trim().toLowerCase();
  if (normalized === "html") return "markup";
  if (normalized && SUPPORTED.has(normalized)) return normalized;
  const detected = detectCodeLanguage(code);
  if (detected === "html") return "markup";
  return detected;
}

export function detectCodeLanguage(code: string): string {
  const sample = code.trim().slice(0, 2000);
  if (!sample) return "text";

  if (
    /^\s*(@charset|@import|@media|@keyframes|:root|@layer)\b/m.test(sample) ||
    /^\s*(\.|#)[\w-]+\s*\{/m.test(sample) ||
    /^\s*[\w#*.][\w-]*\s*:\s*[^;]+;/m.test(sample) ||
    /^\s*body\s*\{/m.test(sample)
  ) {
    return "css";
  }
  if (/^\s*<!DOCTYPE html|<html[\s>]/i.test(sample)) return "html";
  if (/^\s*(def |class |import |from |print\(|if __name__)/m.test(sample)) return "python";
  if (/^\s*(import |export |const |let |function |interface |type )/m.test(sample)) {
    return /:\s*\w+(\[\])?(\s*\||\s*;|\s*=)/.test(sample) ? "typescript" : "javascript";
  }
  if (/^\s*(\{|\[)/.test(sample) && /"\w+"\s*:/.test(sample)) return "json";
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)\s/i.test(sample)) return "sql";
  if (/^\s*#!\/bin\/bash|^\s*(sudo |apt-get |echo \$)/m.test(sample)) return "bash";

  return "text";
}
