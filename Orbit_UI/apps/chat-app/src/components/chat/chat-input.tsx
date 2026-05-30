"use client";

import { useState, useRef, FormEvent, KeyboardEvent, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { ArrowUp, Loader2, Paperclip, Sparkles, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudySource } from "@/types";
import { ContextSelector } from "./context-selector";
import { useRagUpload } from "@/hooks/use-rag-upload";

type ChatInputProps = {
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedSource: StudySource | null;
  onSelectSource: (source: StudySource | null) => void;
  showContextSelector?: boolean;
  conversationId?: string | null;
  columnClassName?: string;
};

export type ChatInputHandle = {
  focus: () => void;
};

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  {
    onSend,
    isLoading,
    selectedSource,
    onSelectSource,
    showContextSelector = true,
    columnClassName,
    conversationId,
  },
  ref,
) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading: pdfUploading, progress: pdfProgress, error: pdfError, uploadPdf } = useRagUpload(conversationId);

  const focusTextarea = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  useImperativeHandle(ref, () => ({ focus: focusTextarea }), [focusTextarea]);

  useEffect(() => {
    focusTextarea();
  }, [focusTextarea]);

  useEffect(() => {
    if (!isLoading) {
      focusTextarea();
    }
  }, [isLoading, focusTextarea]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || pdfUploading) return;
    onSend(trimmed);
    setInput("");
    focusTextarea();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = input.trim().length > 0 && !isLoading && !pdfUploading;

  const handlePdfPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const source = await uploadPdf(file);
    if (source) onSelectSource(source);
  };

  return (
    <div className="shrink-0 w-full bg-transparent pb-4 pt-3 safe-bottom sm:pb-5">
      <div className={cn("relative w-full", columnClassName)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void handlePdfPick(e)}
        />

        {showContextSelector && (
          <div className="mb-2">
            <ContextSelector
              selectedSource={selectedSource}
              onSelect={onSelectSource}
              conversationId={conversationId}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full">
          <div className="w-full rounded-[28px] border border-border/60 bg-card/95 p-2 shadow-[0_16px_48px_-16px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.45)]">
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pdfUploading}
                className="press mb-1 ml-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 sm:inline-flex"
                title="Upload PDF"
              >
                {pdfUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedSource
                    ? `Ask about "${selectedSource.name}"…`
                    : "Ask anything…"
                }
                className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none sm:px-3"
                rows={1}
              />

              <div className="mb-1 mr-1 shrink-0">
                {isLoading ? (
                  <button
                    type="button"
                    className="press inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                    title="Stop generating"
                  >
                    <StopCircle className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={cn(
                      "press inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                      canSend
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
            <Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
            {pdfUploading
              ? pdfProgress || "Processing PDF…"
              : pdfError
                ? pdfError
                : selectedSource
                  ? selectedSource.status === "processing" || selectedSource.status === "pending"
                    ? `Indexing "${selectedSource.name}"…`
                    : `Using context: ${selectedSource.name}`
                  : "Attach a PDF via Uploads or the paperclip · Clovai can make mistakes."}
          </p>
        </form>
      </div>
    </div>
  );
});
