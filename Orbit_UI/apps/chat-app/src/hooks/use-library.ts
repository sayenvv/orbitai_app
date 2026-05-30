"use client";

import { useCallback, useEffect, useState } from "react";
import { publicApi, type ApiRagDocument } from "@/lib/orbit-api";
import { useAuthStore } from "@/store/auth-store";

export type LibraryUpload = {
  id: string;
  title: string;
  status: ApiRagDocument["status"];
  pageCount: number;
  pagesProcessed: number;
  chunkCount: number;
  fileSizeBytes: number;
  createdAt: string;
  errorMessage?: string | null;
};

export type LibraryGeneratedFile = {
  id: string;
  title: string;
  type: string;
  preview: string;
  agentSlug: string;
  agentName: string;
  iconKey: string;
  colorKey: string;
  conversationId?: string | null;
  createdAt: string;
};

function mapUpload(doc: ApiRagDocument): LibraryUpload {
  return {
    id: doc.id,
    title: doc.original_filename || doc.name,
    status: doc.status,
    pageCount: doc.page_count,
    pagesProcessed: doc.pages_processed,
    chunkCount: doc.chunk_count,
    fileSizeBytes: doc.file_size_bytes,
    createdAt: doc.created_at,
    errorMessage: doc.error_message,
  };
}

function mapGenerated(row: {
  id: string;
  title: string;
  type: string;
  preview?: string;
  conversation_id?: string | null;
  agent_slug?: string | null;
  agent_name?: string;
  icon_key?: string;
  color_key?: string;
  created_at: string;
}): LibraryGeneratedFile {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    preview: row.preview ?? "",
    agentSlug: row.agent_slug ?? "general-knowledge",
    agentName: row.agent_name ?? "Clovai",
    iconKey: row.icon_key ?? "Sparkles",
    colorKey: row.color_key ?? "indigo",
    conversationId: row.conversation_id,
    createdAt: row.created_at,
  };
}

export function useLibrary() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [uploads, setUploads] = useState<LibraryUpload[]>([]);
  const [generated, setGenerated] = useState<LibraryGeneratedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setUploads([]);
      setGenerated([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await publicApi.library();
      setUploads(data.uploads.map(mapUpload));
      setGenerated(data.generated.map(mapGenerated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
      setUploads([]);
      setGenerated([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { uploads, generated, loading, error, refresh };
}
