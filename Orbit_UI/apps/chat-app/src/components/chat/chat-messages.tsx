"use client";

import { Message } from "@/types";
import { AssistantReplyShimmer, AssistantTextShimmer } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Bot,
  Copy,
  Check,
  Sparkles,
  Lightbulb,
  FileText,
  MessageSquare,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
  streamingMsgId?: string | null;
  onSuggestionClick?: (text: string) => void;
};

const SUGGESTIONS = [
  {
    icon: Lightbulb,
    title: "Explain a concept",
    prompt: "Explain this concept in simple terms with an example.",
  },
  {
    icon: FileText,
    title: "Summarize content",
    prompt: "Give me a concise summary of the key points.",
  },
  {
    icon: MessageSquare,
    title: "Help me decide",
    prompt: "What are the pros and cons I should consider?",
  },
] as const;

export function ChatMessages({
  messages,
  isLoading,
  streamingMsgId,
  onSuggestionClick,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamingMsgId) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, streamingMsgId]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-36">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                What can I help with?
              </h2>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                Ask anything — research, writing, planning, or brainstorming. Your conversation
                stays here in the sidebar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
              <button
                key={title}
                type="button"
                onClick={() => onSuggestionClick?.(prompt)}
                className="press group flex flex-col items-start gap-2 rounded-2xl border border-border/50 bg-card/60 p-4 text-left shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card hover:shadow-md"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">{title}</span>
                <span className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {prompt}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
      <div className="mx-auto max-w-3xl space-y-1 px-4 py-6 pb-44 sm:px-6 sm:py-8">
        {messages.map((message, index) => {
          const prev = messages[index - 1];
          const isNewTurn = !prev || prev.role !== message.role;

          return (
            <div
              key={message.id}
              className={cn(isNewTurn && index > 0 && "pt-5")}
            >
              <MessageBubble
                message={message}
                isStreaming={message.id === streamingMsgId}
              />
            </div>
          );
        })}
        {isLoading && !streamingMsgId && <AssistantReplyShimmer />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[22px] rounded-br-md bg-primary/12 px-4 py-2.5 dark:bg-primary/20">
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 sm:gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-muted/70 px-4 py-3 dark:bg-muted/45">
        {message.content ? (
          <MarkdownContent content={message.content} isStreaming={isStreaming} />
        ) : isStreaming ? (
          <AssistantTextShimmer />
        ) : null}
        {!isStreaming && message.content && (
          <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 overflow-hidden rounded-2xl border border-zinc-200 bg-[#1e1e2e] shadow-sm dark:border-zinc-700/60">
      <div className="flex items-center justify-between border-b border-zinc-700/50 bg-[#181825] px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            {language || "plaintext"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all",
            copied ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        showLineNumbers={value.split("\n").length > 3}
        lineNumberStyle={{
          color: "#4a4a5a",
          fontSize: "0.7rem",
          paddingRight: "1em",
          minWidth: "2em",
        }}
        customStyle={{
          margin: 0,
          padding: "1rem 1.25rem",
          background: "transparent",
          fontSize: "0.8125rem",
          lineHeight: "1.6",
          borderRadius: 0,
        }}
        wrapLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

const MarkdownContent = memo(function MarkdownContent({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="animate-in fade-in-0 duration-150 text-[15px] text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const value = String(children).replace(/\n$/, "");
            if (match) {
              return <CodeBlock language={match[1]} value={value} />;
            }
            return (
              <code
                className="rounded-md border border-border/50 bg-muted/80 px-1.5 py-0.5 font-mono text-[0.8125rem] text-primary/90"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-7">{children}</p>;
          },
          ul({ children }) {
            return (
              <ul className="mb-3 list-disc space-y-1.5 pl-5 marker:text-primary/40">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:text-primary/60">
                {children}
              </ol>
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
            return <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h4>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 rounded-r-xl border-l-[3px] border-primary/30 bg-primary/[0.03] py-2 pl-4 pr-3 italic text-muted-foreground">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 -mx-2 overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full border-collapse text-xs">{children}</table>
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
            return <td className="border-b border-border/40 px-3 py-2">{children}</td>;
          },
          tr({ children }) {
            return <tr className="transition-colors hover:bg-muted/30">{children}</tr>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary/60"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="my-4 border-border/50" />;
          },
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-foreground/80">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="animate-cursor ml-0.5 -mb-0.5 inline-block h-4 w-0.5 bg-primary/70" />
      )}
    </div>
  );
});
