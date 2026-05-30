"use client";

import { useCallback, useState } from "react";
import { getApiErrorMessage } from "@/lib/orbit-api";
import { uploadPdfAndWait, validatePdfFile, PdfUploadCancelledError } from "@/lib/rag-upload";
import type { StudySource } from "@/types";

export function useRagUpload(conversationId?: string | null) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const uploadPdf = useCallback(
    async (file: File): Promise<StudySource | null> => {
      if (!validatePdfFile(file)) {
        setError("Only PDF files are supported.");
        return null;
      }

      setUploading(true);
      setError("");
      setProgress("Uploading…");

      try {
        const source = await uploadPdfAndWait(file, {
          conversationId,
          onProgress: setProgress,
        });
        return source;
      } catch (err) {
        if (err instanceof PdfUploadCancelledError) {
          return null;
        }
        setError(getApiErrorMessage(err, "Upload failed"));
        return null;
      } finally {
        setUploading(false);
        setProgress("");
      }
    },
    [conversationId],
  );

  const clearError = useCallback(() => setError(""), []);

  return { uploading, progress, error, uploadPdf, clearError };
}
