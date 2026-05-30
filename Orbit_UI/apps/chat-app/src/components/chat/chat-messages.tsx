"use client";

import { Message } from "@/types";
import { AssistantReplyShimmer, AssistantTextShimmer } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bot, User, Copy, Check, BookOpen, Lightbulb, FileText, Terminal } from "lucide-react";
import { useEffect, useRef, useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
  streamingMsgId?: string | null;
};

export function ChatMessages({ messages, isLoading, streamingMsgId }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use instant scroll during streaming to avoid janky smooth scroll accumulation
    if (streamingMsgId) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, streamingMsgId]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 mx-auto border border-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">How can I help you study?</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                I can explain concepts, summarize materials, create flashcards, and answer questions about your study content.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SuggestionCard
              icon={BookOpen}
              title="Explain a concept"
              description="Break down complex topics"
            />
            <SuggestionCard
              icon={FileText}
              title="Summarize notes"
              description="Get concise summaries"
            />
            <SuggestionCard
              icon={Lightbulb}
              title="Quiz me"
              description="Test your understanding"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={message.id === streamingMsgId}
          />
        ))}
        {isLoading && !streamingMsgId && <AssistantReplyShimmer />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
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
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5">
          <p className="text-sm leading-7 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 group">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background">
        <Bot className="h-4 w-4 text-foreground/70" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {message.content ? (
          <MarkdownContent content={message.content} isStreaming={isStreaming} />
        ) : isStreaming ? (
          <AssistantTextShimmer />
        ) : null}
        {!isStreaming && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Code Block with professional styling ---
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700/60 bg-[#1e1e2e] shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-zinc-700/50">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            {language || "plaintext"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all",
            copied
              ? "text-emerald-400"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>
      {/* Code content */}
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        showLineNumbers={value.split("\n").length > 3}
        lineNumberStyle={{ color: "#4a4a5a", fontSize: "0.7rem", paddingRight: "1em", minWidth: "2em" }}
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

// --- Markdown renderer with polished typography ---
const MarkdownContent = memo(function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div className="text-sm text-foreground animate-in fade-in-0 duration-150">
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
                className="px-1.5 py-0.5 rounded-md bg-muted border border-border/50 text-[0.8125rem] font-mono text-primary/90"
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
            return <ul className="mb-3 pl-5 space-y-1.5 list-disc marker:text-primary/40">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-3 pl-5 space-y-1.5 list-decimal marker:text-primary/60">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-7 pl-1">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-3 mt-5 first:mt-0 pb-2 border-b border-border/50">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mb-2 mt-5 first:mt-0 pb-1.5 border-b border-border/30">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mb-2 mt-4 first:mt-0">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-sm font-semibold mb-1.5 mt-3 first:mt-0">{children}</h4>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 pl-4 border-l-[3px] border-primary/30 bg-primary/[0.03] rounded-r-lg py-2 pr-3 italic text-muted-foreground">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 -mx-5 overflow-x-auto">
                <table className="w-full text-xs border-collapse">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted/80 border-y border-border">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-3 py-2 text-left font-semibold text-foreground/80 text-xs uppercase tracking-wider">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 border-b border-border/40">{children}</td>;
          },
          tr({ children }) {
            return <tr className="hover:bg-muted/30 transition-colors">{children}</tr>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 transition-colors"
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
        <span className="inline-block h-4 w-0.5 ml-0.5 -mb-0.5 bg-foreground/70 animate-cursor" />
      )}
    </div>
  );
});

function SuggestionCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <button className="flex flex-col items-start gap-1.5 rounded-xl border bg-card p-4 text-left hover:bg-accent/50 hover:border-primary/20 transition-all group shadow-sm">
      <Icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
      <span className="text-xs font-medium">{title}</span>
      <span className="text-[11px] text-muted-foreground leading-snug">{description}</span>
    </button>
  );
}
