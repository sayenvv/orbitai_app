"use client";

import { useState, useRef, FormEvent, KeyboardEvent, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { ArrowUp, BookOpen, FileUp, Globe, Loader2, Paperclip, Sparkles, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudySource } from "@/types";
import { ContextSelector, type ContextPickerTab } from "./context-selector";
import { ComposerToolsMenu } from "./composer-tools-menu";
import { WebpageUrlComposerField } from "./webpage-url-composer-field";
import { importWebpageUrl, normalizeWebpageUrl, validateWebpageUrl } from "@/lib/web-url-import";
import { getApiErrorMessage } from "@/lib/orbit-api";
import { useRagUpload } from "@/hooks/use-rag-upload";
import { useDoubleBackspace } from "@/hooks/use-double-backspace";

type ChatInputProps = {
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedSource: StudySource | null;
  onSelectSource: (source: StudySource | null) => void;
  showContextSelector?: boolean;
  contextLocked?: boolean;
  conversationId?: string | null;
  columnClassName?: string;
  mobileBottom?: boolean;
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
    contextLocked = false,
    columnClassName,
    conversationId,
    mobileBottom = false,
  },
  ref,
) {
  const [input, setInput] = useState("");
  const [webpageInputMode, setWebpageInputMode] = useState(false);
  const [webpageUrlInput, setWebpageUrlInput] = useState("");
  const [webpageUrlError, setWebpageUrlError] = useState("");
  const [webImporting, setWebImporting] = useState(false);
  const [pickerTab, setPickerTab] = useState<ContextPickerTab>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading: pdfUploading, progress: pdfProgress, error: pdfError, uploadPdf } = useRagUpload(conversationId);
  const { handleBackspace: handleRemoveWebpageBackspace, resetBackspace: resetWebpageBackspace } =
    useDoubleBackspace(() => onSelectSource(null));

  const focusTextarea = useCallback(() => {
    if (webpageInputMode) return;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [webpageInputMode]);

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
    if (webpageInputMode || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [input, webpageInputMode]);

  const enterWebpageMode = useCallback(() => {
    setWebpageInputMode(true);
    setWebpageUrlInput("");
    setWebpageUrlError("");
  }, []);

  const cancelWebpageMode = useCallback(() => {
    setWebpageInputMode(false);
    setWebpageUrlInput("");
    setWebpageUrlError("");
    focusTextarea();
  }, [focusTextarea]);

  const confirmWebpageImport = useCallback(async () => {
    const validationError = validateWebpageUrl(webpageUrlInput);
    if (validationError) {
      setWebpageUrlError(validationError);
      return;
    }

    setWebImporting(true);
    setWebpageUrlError("");
    try {
      const source = await importWebpageUrl(
        normalizeWebpageUrl(webpageUrlInput),
        conversationId,
      );
      onSelectSource(source);
      setWebpageInputMode(false);
      setWebpageUrlInput("");
      focusTextarea();
    } catch (err) {
      setWebpageUrlError(getApiErrorMessage(err, "Could not import webpage"));
    } finally {
      setWebImporting(false);
    }
  }, [webpageUrlInput, conversationId, onSelectSource, focusTextarea]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (webpageInputMode) {
      void confirmWebpageImport();
      return;
    }
    const trimmed = input.trim();
    if (!trimmed || isLoading || pdfUploading || webImporting) return;
    onSend(trimmed);
    setInput("");
    focusTextarea();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (selectedSource?.type === "webpage") {
      const atStart = !input.trim() && (e.currentTarget.selectionStart ?? 0) === 0;
      if (handleRemoveWebpageBackspace(atStart, e)) return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend =
    !webpageInputMode &&
    input.trim().length > 0 &&
    !isLoading &&
    !pdfUploading &&
    !webImporting;

  const canImportWebpage =
    webpageInputMode && webpageUrlInput.trim().length > 0 && !webImporting;

  const handlePdfPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const source = await uploadPdf(file);
    if (source) onSelectSource(source);
  };

  return (
    <div
      className={cn(
        "shrink-0 w-full safe-bottom safe-x",
        mobileBottom
          ? "border-t-0 bg-transparent pb-3 pt-2"
          : "border-t border-border/40 bg-background/80 pb-3 pt-2 backdrop-blur-sm md:border-t-0 md:bg-transparent md:pt-3 md:pb-5",
      )}
    >
      <div className={cn("relative w-full", columnClassName)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void handlePdfPick(e)}
        />

        {showContextSelector && (
          <ContextSelector
            selectedSource={selectedSource}
            onSelect={onSelectSource}
            conversationId={conversationId}
            locked={contextLocked}
            pickerTab={pickerTab}
            onPickerTabChange={setPickerTab}
          />
        )}

        <form onSubmit={handleSubmit} className="w-full">
          <div
            className={cn(
              "gradient-border w-full rounded-[28px] p-2",
              mobileBottom
                ? "bg-card/80 shadow-none backdrop-blur-xl"
                : "bg-card/95 shadow-[0_16px_48px_-16px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.45)]",
            )}
          >
            <div className="flex items-center gap-2">
              {webpageInputMode ? (
                <WebpageUrlComposerField
                  value={webpageUrlInput}
                  onChange={(value) => {
                    setWebpageUrlInput(value);
                    if (webpageUrlError) setWebpageUrlError("");
                  }}
                  onSubmit={() => void confirmWebpageImport()}
                  onCancel={cancelWebpageMode}
                  error={webpageUrlError}
                  loading={webImporting}
                  multiline
                />
              ) : (
                <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-1 rounded-2xl border border-border/50 bg-background/50 pl-1.5 pr-2 transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
                  {pdfUploading || webImporting ? (
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </span>
                  ) : (
                    <ComposerToolsMenu
                      tools={[
                        {
                          id: "materials",
                          label: "Study Materials",
                          description: "Select from your saved study content",
                          icon: BookOpen,
                          iconGradient: "from-indigo-500 via-violet-500 to-purple-500",
                          disabled: contextLocked,
                          onSelect: () => setPickerTab("materials"),
                        },
                        {
                          id: "webpage",
                          label: "Webpage",
                          description: "Import a public doc or article URL",
                          icon: Globe,
                          iconGradient: "from-sky-500 via-cyan-400 to-teal-400",
                          badge: "New",
                          active: selectedSource?.type === "webpage",
                          disabled: contextLocked,
                          onSelect: enterWebpageMode,
                        },
                        {
                          id: "uploads",
                          label: "Uploaded Files",
                          description: "Pick or upload PDFs for this chat",
                          icon: FileUp,
                          iconGradient: "from-orange-500 via-amber-500 to-yellow-400",
                          disabled: contextLocked,
                          onSelect: () => setPickerTab("files"),
                        },
                        {
                          id: "pdf",
                          label: "Upload PDF",
                          description: "Attach a document for Q&A in this chat",
                          icon: Paperclip,
                          iconGradient: "from-orange-500 via-amber-500 to-yellow-400",
                          disabled: contextLocked,
                          onSelect: () => fileInputRef.current?.click(),
                        },
                      ]}
                      disabled={contextLocked}
                      placement={mobileBottom ? "top" : "bottom"}
                      size="md"
                      variant="inline"
                    />
                  )}

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                  setInput(e.target.value);
                  resetWebpageBackspace();
                }}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      selectedSource?.type === "webpage"
                        ? `Ask about "${selectedSource.name}"…`
                        : selectedSource
                          ? `Ask about "${selectedSource.name}"…`
                          : "Ask anything…"
                    }
                    className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none"
                    rows={1}
                  />
                </div>
              )}

              <div className="shrink-0">
                {isLoading ? (
                  <button
                    type="button"
                    className="press inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                    title="Stop generating"
                  >
                    <StopCircle className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={webpageInputMode ? !canImportWebpage : !canSend}
                    className={cn(
                      "press inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200",
                      webpageInputMode
                        ? canImportWebpage
                          ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/25 hover:brightness-105"
                          : "bg-muted text-muted-foreground"
                        : canSend
                          ? "bg-gradient-to-br from-primary via-violet-500 to-sky-500 text-white shadow-md shadow-primary/25 hover:brightness-105"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {webImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-2 hidden items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80 sm:flex">
            <Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
            {webpageInputMode
              ? "Paste a public URL · Enter to import · Double Backspace or Esc to cancel"
              : pdfUploading
                ? pdfProgress || "Processing PDF…"
                : webImporting
                  ? "Importing webpage…"
                  : pdfError
                    ? pdfError
                    : selectedSource
                      ? selectedSource.status === "processing" || selectedSource.status === "pending"
                        ? `Indexing "${selectedSource.name}"…`
                        : selectedSource.type === "webpage"
                          ? `Using webpage: ${selectedSource.name}`
                          : `Using context: ${selectedSource.name}`
                      : "Tap + to attach PDFs or webpages · Clovai can make mistakes."}
          </p>
        </form>
      </div>
    </div>
  );
});
