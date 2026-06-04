"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const artifactMarkdownComponents: Components = {
  p({ children }) {
    return <p className="mb-3 last:mb-0 leading-7">{children}</p>;
  },
  ul({ children }) {
    return <ul className="mb-3 list-disc space-y-1.5 pl-5 marker:text-primary/40">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:text-primary/60">{children}</ol>;
  },
  li({ children }) {
    return <li className="pl-1 leading-7">{children}</li>;
  },
  h1({ children }) {
    return (
      <h1 className="mb-3 mt-5 border-b border-border/50 pb-2 text-xl font-bold first:mt-0">{children}</h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="mb-2 mt-5 border-b border-border/30 pb-1.5 text-lg font-semibold first:mt-0">{children}</h2>
    );
  },
  h3({ children }) {
    return <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>;
  },
  h4({ children }) {
    return <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h4>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic text-foreground/80">{children}</em>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-3 rounded-r-xl border-l-[3px] border-primary/30 bg-primary/[0.03] py-2 pl-4 pr-3 italic text-muted-foreground">
        {children}
      </blockquote>
    );
  },
  code({ children, className }) {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code className={cn("block font-mono text-[0.8125rem] leading-relaxed", className)}>{children}</code>
      );
    }
    return (
      <code className="rounded-md border border-border/50 bg-muted/80 px-1.5 py-0.5 font-mono text-[0.8125rem]">
        {children}
      </code>
    );
  },
  pre({ children }) {
    return (
      <pre className="my-3 overflow-x-auto rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-xs leading-relaxed">
        {children}
      </pre>
    );
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="border-b border-border bg-muted/80">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border-b border-border/40 px-3 py-2 align-top">{children}</td>;
  },
  tr({ children }) {
    return <tr className="transition-colors hover:bg-muted/20">{children}</tr>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60"
      >
        {children}
      </a>
    );
  },
  hr() {
    return <hr className="my-4 border-border/50" />;
  },
};

export function ArtifactMarkdownPreview({
  content,
  className,
  emptyLabel = "Nothing to preview yet.",
}: {
  content: string;
  className?: string;
  emptyLabel?: string;
}) {
  if (!content.trim()) {
    return <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className={cn("artifact-markdown-preview text-[15px] leading-relaxed text-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={artifactMarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
