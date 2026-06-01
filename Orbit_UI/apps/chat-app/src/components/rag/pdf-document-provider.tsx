"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfDocument } from "@/lib/pdfjs";

type PdfDocumentContextValue = {
  documentId: string;
  document: PDFDocumentProxy | null;
  loading: boolean;
  error: string | null;
  numPages: number;
};

const PdfDocumentContext = createContext<PdfDocumentContextValue | null>(null);

export function PdfDocumentProvider({
  documentId,
  children,
}: {
  documentId: string;
  children: ReactNode;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let active = true;
    let pdf: PDFDocumentProxy | null = null;

    setLoading(true);
    setError(null);
    setDocument(null);
    setNumPages(0);

    loadPdfDocument(documentId)
      .then((loaded) => {
        if (!active) {
          void loaded.destroy();
          return;
        }
        pdf = loaded;
        setDocument(loaded);
        setNumPages(loaded.numPages);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load PDF");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (pdf) void pdf.destroy();
    };
  }, [documentId]);

  const value = useMemo(
    () => ({
      documentId,
      document,
      loading,
      error,
      numPages,
    }),
    [documentId, document, loading, error, numPages],
  );

  return <PdfDocumentContext.Provider value={value}>{children}</PdfDocumentContext.Provider>;
}

export function usePdfDocument(): PdfDocumentContextValue {
  const context = useContext(PdfDocumentContext);
  if (!context) {
    throw new Error("usePdfDocument must be used within PdfDocumentProvider");
  }
  return context;
}
