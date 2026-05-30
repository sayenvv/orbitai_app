"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type InsightsMarkdownProps = {
  content: string;
  className?: string;
};

export function InsightsMarkdown({ content, className }: InsightsMarkdownProps) {
  return (
    <div className={cn("text-[15px] leading-relaxed text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-7">{children}</p>;
          },
          ul({ children }) {
            return (
              <ul className="mb-3 list-disc space-y-1.5 pl-5 marker:text-primary/40">{children}</ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:text-primary/60">{children}</ol>
            );
          },
          li({ children }) {
            return <li className="pl-1 leading-7">{children}</li>;
          },
          h1({ children }) {
            return (
              <h1 className="mb-3 mt-5 border-b border-border/50 pb-2 text-xl font-bold first:mt-0">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="mb-2 mt-5 border-b border-border/30 pb-1.5 text-lg font-semibold first:mt-0">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 rounded-r-xl border-l-[3px] border-primary/30 bg-primary/[0.03] py-2 pl-4 pr-3 italic text-muted-foreground">
                {children}
              </blockquote>
            );
          },
          code({ children }) {
            return (
              <code className="rounded-md border border-border/50 bg-muted/80 px-1.5 py-0.5 font-mono text-[0.8125rem]">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
