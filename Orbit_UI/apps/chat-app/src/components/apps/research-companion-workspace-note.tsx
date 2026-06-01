"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn, randomId } from "@/lib/utils";

type WorkspaceNote = {
  id: string;
  page: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type ResearchCompanionWorkspaceNoteProps = {
  sourceId: string;
  sourceName?: string | null;
  activePage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
};

function notesStorageKey(sourceId: string): string {
  return `rc-workspace-notes:${sourceId}`;
}

function readStoredNotes(sourceId: string): WorkspaceNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(notesStorageKey(sourceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (note): note is WorkspaceNote =>
          note &&
          typeof note === "object" &&
          typeof note.id === "string" &&
          typeof note.page === "number" &&
          typeof note.content === "string",
      );
    }

    if (parsed && typeof parsed === "object") {
      const legacy = parsed as Record<string, string>;
      const now = new Date().toISOString();
      return Object.entries(legacy)
        .map(([page, content]) => {
          const pageNumber = Number(page);
          if (!Number.isFinite(pageNumber) || !content?.trim()) return null;
          return {
            id: randomId(),
            page: pageNumber,
            content: content.trim(),
            createdAt: now,
            updatedAt: now,
          } satisfies WorkspaceNote;
        })
        .filter((note): note is WorkspaceNote => note !== null);
    }

    return [];
  } catch {
    return [];
  }
}

function writeStoredNotes(sourceId: string, notes: WorkspaceNote[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(notesStorageKey(sourceId), JSON.stringify(notes));
}

export function ResearchCompanionWorkspaceNote({
  sourceId,
  sourceName,
  activePage,
  pageCount,
  onPageChange,
  onClose,
}: ResearchCompanionWorkspaceNoteProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setNotes(readStoredNotes(sourceId));
    setDraft("");
    setSelectedNoteId(null);
    setHydrated(true);
  }, [sourceId]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [draft]);

  const persistNotes = useCallback(
    (nextNotes: WorkspaceNote[]) => {
      setNotes(nextNotes);
      writeStoredNotes(sourceId, nextNotes);
    },
    [sourceId],
  );

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
    [notes],
  );

  const documentLabel = sourceName?.trim() || "Selected document";
  const isEditing = selectedNoteId !== null;

  const resetComposer = () => {
    setDraft("");
    setSelectedNoteId(null);
    textareaRef.current?.focus();
  };

  const handleAddOrUpdateNote = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();

    if (selectedNoteId) {
      persistNotes(
        notes.map((note) =>
          note.id === selectedNoteId
            ? { ...note, content: trimmed, page: activePage, updatedAt: now }
            : note,
        ),
      );
      resetComposer();
      return;
    }

    const newNote: WorkspaceNote = {
      id: randomId(),
      page: activePage,
      content: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    persistNotes([newNote, ...notes]);
    resetComposer();
  };

  const handleSelectNote = (note: WorkspaceNote) => {
    setSelectedNoteId(note.id);
    setDraft(note.content);
    onPageChange(note.page);
    textareaRef.current?.focus();
  };

  const handleDeleteNote = (noteId: string) => {
    persistNotes(notes.filter((note) => note.id !== noteId));
    if (selectedNoteId === noteId) {
      resetComposer();
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/30 px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/30 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/30 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Back to tools"
            title="Back to tools"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Notes</p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              Page {activePage} of {pageCount} · {documentLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {isEditing ? "Edit note" : "Write a note"}
        </label>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write your note here…"
          rows={4}
          className="mt-2 w-full resize-none rounded-xl border border-border/30 bg-background/55 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          aria-label="Note text"
        />

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddOrUpdateNote}
            disabled={!draft.trim()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {isEditing ? "Update note" : "Add note"}
          </button>
          {(isEditing || draft.trim()) && (
            <button
              type="button"
              onClick={resetComposer}
              className="inline-flex h-9 items-center rounded-xl border border-border/30 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-border/30 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Your notes ({sortedNotes.length})
          </p>

          {sortedNotes.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              No notes yet. Write above and click Add note.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 pb-1">
              {sortedNotes.map((note) => (
                <li
                  key={note.id}
                  className={cn(
                    "rounded-xl border border-border/30 bg-background/55",
                    selectedNoteId === note.id && "border-primary/25 ring-1 ring-primary/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectNote(note)}
                    className="w-full px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-foreground">Page {note.page}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {note.content}
                    </p>
                  </button>
                  <div className="flex justify-end border-t border-border/20 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
