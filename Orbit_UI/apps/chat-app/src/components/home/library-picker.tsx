"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Paperclip, Search } from "lucide-react";
import type { LibraryItem } from "@/lib/home-data";

type LibraryPickerProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  items: LibraryItem[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onClearSelection: () => void;
  onClose: () => void;
  onUploadNew: () => void;
};

export function LibraryPicker({
  open,
  anchorRef,
  items,
  search,
  onSearchChange,
  selectedId,
  onSelectItem,
  onClearSelection,
  onClose,
  onUploadNew,
}: LibraryPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const panelWidth = 576; // 36rem
      const padding = 12;
      const left = Math.min(
        Math.max(padding, rect.left),
        window.innerWidth - panelWidth - padding
      );
      setPosition({ top: rect.bottom + 8, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.source.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close library"
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Library"
        className="fixed z-[9999] w-[36rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-mac-lg"
        style={{ top: position.top, left: position.left }}
      >
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search uploads & generated content…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nothing matches “{search}”
            </p>
          ) : (
            filtered.map((item) => {
              const selected = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent ${
                    selected ? "bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-primary" : "border-border"
                    }`}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.type} · {item.source} · {item.date}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="truncate pr-3">
            {selectedId
              ? items.find((item) => item.id === selectedId)?.title ?? "1 file selected"
              : "No file selected"}
          </span>
          <div className="flex shrink-0 items-center gap-3">
            {selectedId && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-primary hover:underline"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onUploadNew}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Paperclip className="h-3 w-3" /> Upload new
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
