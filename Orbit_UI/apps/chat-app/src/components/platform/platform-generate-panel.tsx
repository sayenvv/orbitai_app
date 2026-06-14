"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { platformApi, type PlatformStreamEvent } from "@/lib/orbit-api";
import {
  IdleHero,
  PlatformBackdrop,
  StudioWorkspace,
} from "@/components/platform/platform-parts";

export function PlatformGeneratePanel() {
  const [prompt, setPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<PlatformStreamEvent[]>([]);
  const [artifactUrl, setArtifactUrl] = useState<string | null>(null);
  const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showWorkspace = hasStarted || running || logs.length > 0 || Boolean(artifactUrl) || Boolean(error);

  useEffect(() => {
    if (!running) return;
    startedAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const appendLog = useCallback((event: PlatformStreamEvent) => {
    if (event.stage) {
      setActiveStage(event.stage);
    }
    if (event.type === "agent_progress" || event.type === "heartbeat" || event.type === "agent_started") {
      if (event.message) setLiveMessage(event.message);
    }
    if (event.type === "agent_completed" && event.message) {
      setLiveMessage(event.message);
    }
    if (event.type === "completed" && event.message) {
      setLiveMessage(event.message);
    }

    setLogs((prev) => [...prev, event]);

    if (event.type === "completed") {
      if (event.payload?.artifact_url) {
        setArtifactUrl(String(event.payload.artifact_url));
      }
      if (event.payload?.workflow_run_id) {
        setWorkflowRunId(String(event.payload.workflow_run_id));
      }
    }
    if (event.type === "error") {
      setError(event.message ?? "Generation failed");
      setLiveMessage(event.message ?? "Generation failed");
    }
  }, []);

  const runGeneration = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || running) return;

    setHasStarted(true);
    setRunning(true);
    setLogs([]);
    setArtifactUrl(null);
    setWorkflowRunId(null);
    setError(null);
    setActiveStage("");
    setLiveMessage("Starting project generation…");
    setElapsed(0);

    try {
      for await (const event of platformApi.streamGenerate({ prompt: trimmed })) {
        appendLog(event);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      setLiveMessage(message);
    } finally {
      setRunning(false);
    }
  }, [appendLog, prompt, running]);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;
    setAttachedFiles((prev) => [...prev, ...picked]);
    event.target.value = "";
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const statusHint = useMemo(() => {
    if (running) return liveMessage || "Agents are working through the pipeline…";
    if (artifactUrl) return "Your ZIP artifact is ready to download.";
    if (error) return error;
    return liveMessage;
  }, [artifactUrl, error, liveMessage, running]);

  return (
    <PlatformBackdrop>
      <AnimatePresence mode="wait" initial={false}>
        {!showWorkspace ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <IdleHero
              prompt={prompt}
              onPromptChange={setPrompt}
              onSubmit={runGeneration}
              running={running}
              onTemplateSelect={setPrompt}
              attachedFiles={attachedFiles}
              onAttachClick={handleAttachClick}
              onRemoveFile={handleRemoveFile}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
            />
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <StudioWorkspace
              prompt={prompt}
              running={running}
              activeStage={activeStage}
              liveMessage={statusHint}
              elapsed={elapsed}
              logs={logs}
              artifactUrl={artifactUrl}
              error={error}
              workflowRunId={workflowRunId}
              onRunAgain={runGeneration}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PlatformBackdrop>
  );
}
