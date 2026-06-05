"use client";

import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type LibraryDeleteDialogProps = {
  open: boolean;
  title: string;
  itemName: string;
  description: string;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LibraryDeleteDialog({
  open,
  title,
  itemName,
  description,
  deleting = false,
  onCancel,
  onConfirm,
}: LibraryDeleteDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        onClick={() => !deleting && onCancel()}
        disabled={deleting}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="library-delete-title"
        aria-describedby="library-delete-description"
        className={cn(
          "glass-surface glass-modal glass-composer relative w-full max-w-[400px] overflow-hidden rounded-2xl",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-destructive/10 to-transparent"
        />

        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-6 pb-6 pt-7">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 shadow-sm">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>

          <div className="text-center">
            <h2 id="library-delete-title" className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p id="library-delete-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-muted/25 px-4 py-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              File
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground" title={itemName}>
              {itemName}
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="w-full rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50 sm:w-auto sm:min-w-[100px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 disabled:opacity-60 sm:w-auto sm:min-w-[120px]"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
