"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Globe, Paperclip } from "lucide-react";
import { navigateToChatLaunch } from "@/lib/chat-navigation";
import { useAuthStore } from "@/store/auth-store";
import { useAppShell } from "@/components/layout/app-shell-context";
import { uploadPdfAndWait, validatePdfFile, PdfUploadCancelledError } from "@/lib/rag-upload";
import { importWebpageUrl, normalizeWebpageUrl, validateWebpageUrl, webpageLabelFromUrl, type WebpageDraft } from "@/lib/web-url-import";
import { buildLibraryComposerItems, mapLibraryUploadToSource } from "@/lib/library-composer";
import { useLibrary } from "@/hooks/use-library";
import { useDoubleBackspace } from "@/hooks/use-double-backspace";
import { HomeDesktopHero } from "@/components/home/home-desktop-hero";
import { randomId } from "@/lib/utils";
import type { StudySource } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { setHeader, openAuthPrompt } = useAppShell();
  const { uploads: libraryUploads, loading: libraryLoading, refresh: refreshLibrary } = useLibrary();
  const { handleBackspace: handleRemoveWebpageBackspace, resetBackspace: resetWebpageBackspace } =
    useDoubleBackspace(() => setAttachedWebpage(null));

  const [chatInput, setChatInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedWebpage, setAttachedWebpage] = useState<WebpageDraft | null>(null);
  const [webpageInputMode, setWebpageInputMode] = useState(false);
  const [webpageUrlInput, setWebpageUrlInput] = useState("");
  const [webpageUrlError, setWebpageUrlError] = useState("");
  const [libraryInputMode, setLibraryInputMode] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [attachedLibrarySource, setAttachedLibrarySource] = useState<StudySource | null>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setHeader(null);
    return () => setHeader(null);
  }, [setHeader]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(validatePdfFile);
    if (files.length) {
      setAttachedFiles((prev) => [...prev, ...files]);
      setAttachedWebpage(null);
      setAttachedLibrarySource(null);
      setHeroUploadError("");
    } else if (e.target.files?.length) {
      setHeroUploadError("Only PDF files are supported.");
    }
    if (e.target) e.target.value = "";
  };

  const removeFile = (idx: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const canSend =
    !webpageInputMode &&
    !libraryInputMode &&
    (chatInput.trim().length > 0 ||
      attachedFiles.length > 0 ||
      Boolean(attachedWebpage) ||
      Boolean(attachedLibrarySource)) &&
    !heroUploading;

  const canAttachWebpage =
    webpageInputMode && webpageUrlInput.trim().length > 0 && !heroUploading;

  const enterWebpageMode = () => {
    setWebpageInputMode(true);
    setWebpageUrlInput("");
    setWebpageUrlError("");
    setHeroUploadError("");
  };

  const cancelWebpageMode = () => {
    setWebpageInputMode(false);
    setWebpageUrlInput("");
    setWebpageUrlError("");
  };

  const enterLibraryMode = () => {
    if (!isAuthenticated) {
      openAuthPrompt();
      return;
    }
    setLibraryInputMode(true);
    setLibrarySearch("");
    setHeroUploadError("");
    void refreshLibrary();
  };

  const cancelLibraryMode = () => {
    setLibraryInputMode(false);
    setLibrarySearch("");
  };

  const selectLibraryUpload = (uploadId: string) => {
    const upload = libraryUploads.find((item) => item.id === uploadId);
    if (!upload) return;
    setAttachedLibrarySource(mapLibraryUploadToSource(upload));
    setAttachedFiles([]);
    setAttachedWebpage(null);
    setLibraryInputMode(false);
    setLibrarySearch("");
    setHeroUploadError("");
  };

  const confirmWebpageUrl = () => {
    const validationError = validateWebpageUrl(webpageUrlInput);
    if (validationError) {
      setWebpageUrlError(validationError);
      return;
    }
    const normalized = normalizeWebpageUrl(webpageUrlInput);
    setAttachedWebpage({
      url: normalized,
      label: webpageLabelFromUrl(normalized),
    });
    setAttachedFiles([]);
    setAttachedLibrarySource(null);
    setWebpageInputMode(false);
    setWebpageUrlInput("");
    setWebpageUrlError("");
    setHeroUploadError("");
  };

  const handleHeroSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed && attachedFiles.length === 0 && !attachedWebpage) return;

    if (!isAuthenticated) {
      openAuthPrompt();
      return;
    }

    if (attachedLibrarySource) {
      setHeroUploading(true);
      setHeroUploadError("");
      try {
        await navigateToChatLaunch(router, {
          prompt: trimmed || "Summarize this document",
          sendKey: randomId(),
          source: attachedLibrarySource,
        });
      } catch (err) {
        setHeroUploadError(err instanceof Error ? err.message : "Could not start chat");
      } finally {
        setHeroUploading(false);
      }
      return;
    }

    if (attachedWebpage) {
      setHeroUploading(true);
      setHeroUploadError("");
      try {
        const source = await importWebpageUrl(attachedWebpage.url);
        await navigateToChatLaunch(router, {
          prompt: trimmed || `Summarize and answer questions about ${attachedWebpage.label}`,
          sendKey: randomId(),
          source,
        });
      } catch (err) {
        setHeroUploadError(err instanceof Error ? err.message : "Webpage import failed");
      } finally {
        setHeroUploading(false);
      }
      return;
    }

    if (attachedFiles.length > 0) {
      setHeroUploading(true);
      setHeroUploadError("");
      try {
        const source = await uploadPdfAndWait(attachedFiles[0]);
        await navigateToChatLaunch(router, {
          prompt: trimmed || "Summarize this document",
          sendKey: randomId(),
          source,
        });
      } catch (err) {
        if (err instanceof PdfUploadCancelledError) return;
        setHeroUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setHeroUploading(false);
      }
      return;
    }

    setHeroUploading(true);
    setHeroUploadError("");
    try {
      await navigateToChatLaunch(router, {
        prompt: trimmed,
        sendKey: randomId(),
      });
    } catch (err) {
      setHeroUploadError(err instanceof Error ? err.message : "Could not start chat");
    } finally {
      setHeroUploading(false);
    }
  };

  const libraryComposerItems = buildLibraryComposerItems(libraryUploads);

  const composerTools = [
    {
      id: "pdf",
      label: "Upload PDF",
      description: "Attach documents for instant AI analysis",
      icon: Paperclip,
      iconGradient: "from-orange-500 via-amber-500 to-yellow-400",
      active: attachedFiles.length > 0,
      onSelect: () => fileInputRef.current?.click(),
    },
    {
      id: "webpage",
      label: "Webpage",
      description: "Import docs, articles & help pages from any URL",
      icon: Globe,
      iconGradient: "from-sky-500 via-cyan-400 to-teal-400",
      badge: "New",
      active: !!attachedWebpage || webpageInputMode,
      onSelect: enterWebpageMode,
    },
    {
      id: "library",
      label: "Library",
      description: "Browse files you've saved before",
      icon: FolderOpen,
      iconGradient: "from-violet-500 via-purple-500 to-indigo-500",
      active: !!attachedLibrarySource || libraryInputMode,
      onSelect: enterLibraryMode,
    },
  ];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="home-page-canvas pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <HomeDesktopHero
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          attachedFiles={attachedFiles}
          attachedWebpage={attachedWebpage}
          onRemoveWebpage={() => setAttachedWebpage(null)}
          attachedLibrarySource={attachedLibrarySource}
          onRemoveLibrarySource={() => setAttachedLibrarySource(null)}
          onRemoveFile={removeFile}
          webpageInputMode={webpageInputMode}
          webpageUrlInput={webpageUrlInput}
          onWebpageUrlInputChange={(value) => {
            setWebpageUrlInput(value);
            if (webpageUrlError) setWebpageUrlError("");
          }}
          webpageUrlError={webpageUrlError}
          onConfirmWebpageUrl={confirmWebpageUrl}
          onCancelWebpageMode={cancelWebpageMode}
          libraryInputMode={libraryInputMode}
          librarySearch={librarySearch}
          onLibrarySearchChange={setLibrarySearch}
          libraryComposerItems={libraryComposerItems}
          onSelectLibraryItem={selectLibraryUpload}
          onCancelLibraryMode={cancelLibraryMode}
          onUploadNewFromLibrary={() => {
            cancelLibraryMode();
            fileInputRef.current?.click();
          }}
          libraryLoading={libraryLoading}
          heroUploading={heroUploading}
          heroUploadError={heroUploadError}
          canSend={canSend}
          canAttachWebpage={canAttachWebpage}
          onSend={() => void handleHeroSend()}
          onFileInputClick={() => fileInputRef.current?.click()}
          onFileChange={handleFileChange}
          fileInputRef={fileInputRef}
          composerTools={composerTools}
          onComposerKeyDown={(e) => {
            if (attachedWebpage) {
              const atStart = !chatInput && (e.currentTarget.selectionStart ?? 0) === 0;
              if (handleRemoveWebpageBackspace(atStart, e)) return;
            }
          }}
          onQuickStartPrompt={setChatInput}
        />
    </div>
  );
}
