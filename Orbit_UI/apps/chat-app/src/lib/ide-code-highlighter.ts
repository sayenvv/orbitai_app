import type { CSSProperties } from "react";
import {
  createCodePlugin,
  type HighlightOptions,
  type HighlightResult,
} from "@streamdown/code";

export const IDE_CODE_THEMES = ["github-light", "github-dark"] as const;

const highlighter = createCodePlugin({ themes: [...IDE_CODE_THEMES] });

type IdeLanguage = HighlightOptions["language"];

export function mapIdeLanguage(language: string): IdeLanguage {
  const normalized = language.trim().toLowerCase();
  if (normalized === "typescript" || normalized === "ts") return "typescript";
  if (normalized === "javascript" || normalized === "js") return "javascript";
  if (normalized === "json") return "json";
  if (normalized === "markdown" || normalized === "md") return "markdown";
  if (highlighter.supportsLanguage(normalized as IdeLanguage)) {
    return normalized as IdeLanguage;
  }
  return "plaintext" as IdeLanguage;
}

export function highlightIdeCode(
  code: string,
  language: string,
  onReady: (result: HighlightResult) => void,
): HighlightResult | null {
  return highlighter.highlight(
    {
      code,
      language: mapIdeLanguage(language),
      themes: highlighter.getThemes(),
    },
    onReady,
  );
}

type HighlightToken = HighlightResult["tokens"][number][number];

export function highlightTokenStyle(token: HighlightToken): CSSProperties | undefined {
  if (token.htmlStyle) {
    if (typeof token.htmlStyle === "string") {
      return parseHtmlStyle(token.htmlStyle);
    }
    return token.htmlStyle as CSSProperties;
  }
  if (token.color || token.bgColor) {
    return {
      color: token.color,
      backgroundColor: token.bgColor,
    };
  }
  return undefined;
}

function parseHtmlStyle(htmlStyle: string): CSSProperties {
  const style: Record<string, string> = {};

  for (const declaration of htmlStyle.split(";")) {
    const colonIndex = declaration.indexOf(":");
    if (colonIndex === -1) continue;

    const property = declaration.slice(0, colonIndex).trim();
    const value = declaration.slice(colonIndex + 1).trim();
    if (!property || !value) continue;

    if (property.startsWith("--")) {
      style[property] = value;
      continue;
    }

    style[toCamelCase(property)] = value;
  }

  return style as CSSProperties;
}

function toCamelCase(property: string): string {
  return property.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}
