"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { platformApi, type PlatformStreamEvent } from "@/lib/orbit-api";
import {
  readRecentStudioDevelopments,
  recordRecentStudioDevelopment,
  type RecentStudioDevelopment,
} from "@/lib/studio-recent-developments";
import {
  IdleHero,
  PlatformBackdrop,
  StudioWorkspace,
} from "@/components/platform/platform-parts";
import { randomId } from "@/lib/utils";

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
  const [recentDevelopments, setRecentDevelopments] = useState<RecentStudioDevelopment[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeDevelopmentIdRef = useRef<string | null>(null);

  const showWorkspace = hasStarted || running || logs.length > 0 || Boolean(artifactUrl) || Boolean(error);

  useEffect(() => {
    if (!showWorkspace) {
      setRecentDevelopments(readRecentStudioDevelopments());
    }
  }, [showWorkspace]);

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

  const persistDevelopment = useCallback(
    ({
      id,
      prompt: savedPrompt,
      workflowRunId: runId = null,
      artifactUrl: artifact = null,
      status,
    }: {
      id: string;
      prompt: string;
      workflowRunId?: string | null;
      artifactUrl?: string | null;
      status: RecentStudioDevelopment["status"];
    }) => {
      setRecentDevelopments(
        recordRecentStudioDevelopment({
          id,
          prompt: savedPrompt,
          workflowRunId: runId,
          artifactUrl: artifact,
          status,
        }),
      );
    },
    [],
  );

  const appendLog = useCallback(
    (event: PlatformStreamEvent) => {
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
        const nextArtifact = event.payload?.artifact_url ? String(event.payload.artifact_url) : null;
        const nextRunId = event.payload?.workflow_run_id ? String(event.payload.workflow_run_id) : null;
        if (nextArtifact) setArtifactUrl(nextArtifact);
        if (nextRunId) setWorkflowRunId(nextRunId);
        if (activeDevelopmentIdRef.current) {
          persistDevelopment({
            id: activeDevelopmentIdRef.current,
            prompt,
            workflowRunId: nextRunId,
            artifactUrl: nextArtifact,
            status: "complete",
          });
        }
      }
      if (event.type === "error") {
        setError(event.message ?? "Generation failed");
        setLiveMessage(event.message ?? "Generation failed");
        if (activeDevelopmentIdRef.current) {
          persistDevelopment({
            id: activeDevelopmentIdRef.current,
            prompt,
            status: "failed",
          });
        }
      }
    },
    [persistDevelopment, prompt],
  );

  const runGeneration = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || running) return;

    const developmentId = activeDevelopmentIdRef.current ?? randomId();
    activeDevelopmentIdRef.current = developmentId;

    setHasStarted(true);
    setRunning(true);
    setLogs([]);
    setArtifactUrl(null);
    setWorkflowRunId(null);
    setError(null);
    setActiveStage("");
    setLiveMessage("Starting project generation…");
    setElapsed(0);
    persistDevelopment({
      id: developmentId,
      prompt: trimmed,
      status: "in_progress",
    });

    try {
      for await (const event of platformApi.streamGenerate({ prompt: trimmed })) {
        appendLog(event);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      setLiveMessage(message);
      if (activeDevelopmentIdRef.current) {
        persistDevelopment({
          id: activeDevelopmentIdRef.current,
          prompt: trimmed,
          status: "failed",
        });
      }
    } finally {
      setRunning(false);
    }
  }, [appendLog, persistDevelopment, prompt, running]);

  const openRecentDevelopment = useCallback(
    (developmentId: string) => {
      const project = recentDevelopments.find((item) => item.id === developmentId);
      if (!project) return;

      activeDevelopmentIdRef.current = project.id;
      setPrompt(project.prompt);
      setHasStarted(true);
      setRunning(false);
      setLogs([]);
      setError(project.status === "failed" ? "Previous generation failed" : null);
      setArtifactUrl(project.artifactUrl);
      setWorkflowRunId(project.workflowRunId);
      setActiveStage(project.status === "complete" ? "completed" : "");
      setLiveMessage(
        project.status === "complete"
          ? "Your ZIP artifact is ready to download."
          : project.status === "failed"
            ? "Previous generation failed"
            : "",
      );
      setElapsed(0);
      setRecentDevelopments(
        recordRecentStudioDevelopment({
          id: project.id,
          title: project.title,
          prompt: project.prompt,
          workflowRunId: project.workflowRunId,
          artifactUrl: project.artifactUrl,
          status: project.status,
        }),
      );
    },
    [recentDevelopments],
  );

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PlatformBackdrop plain={showWorkspace} home={!showWorkspace}>
      <AnimatePresence mode="wait" initial={false}>
        {!showWorkspace ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex min-h-0 flex-1 flex-col"
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
              recentDevelopments={recentDevelopments}
              onOpenRecentDevelopment={openRecentDevelopment}
            />
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
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
    </div>
  );
}
