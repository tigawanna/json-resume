import { useViewer } from "@/data-access-layer/auth/viewer";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { PromptAreaHandle } from "@/components/prompt-area/types";
import { fetchServerSentEvents, useChat, type UIMessage } from "@tanstack/ai-react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { eventSourcedResumeAiClientTools } from "../-utils/client-tools";
import {
  createEventSourcedChatPersistence,
  handOverChatMessages,
} from "../-utils/event-sourced-chat-persistence";
import type { AiChange, LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import type { WorkbenchTab } from "@/features/agentic-tools/resume-tool-schemas";
import type { ToolApprovalRequest } from "../-components/ToolApprovalCard";
import { useEventSourcedAiSettings } from "./use-event-sourced-ai-settings";
import { isLocalMode } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-types";
import {
  getMessageText,
  getSessionChars,
} from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-message-utils";

export function useEventSourcedResumeAiChat(resumeId: string) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const {
    settings,
    saveSettings,
    clearSettings,
    systemPrompt,
    saveSystemPrompt,
    resetSystemPrompt,
    isCustomSystemPrompt,
  } = useEventSourcedAiSettings();
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const router = useRouter();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<PromptAreaHandle>(null);
  const isReady = isLocalMode || !!settings;
  const userId = viewer.user?.id ?? "";
  const dbRef = useRef(db);
  const userIdRef = useRef(userId);
  dbRef.current = db;
  userIdRef.current = userId;
  const persistenceRef = useRef(
    createEventSourcedChatPersistence<typeof eventSourcedResumeAiClientTools>({
      getDb: () => dbRef.current,
      getUserId: () => userIdRef.current,
      resumeId,
    }),
  );

  const [activeResume, setActiveResume] = useState({ pageResumeId: resumeId, id: resumeId });
  const activeResumeId = activeResume.pageResumeId === resumeId ? activeResume.id : resumeId;
  const activeResumeIdRef = useRef(activeResumeId);
  activeResumeIdRef.current = activeResumeId;
  const pendingOpenRef = useRef<{ resumeId: string; tab: WorkbenchTab } | null>(null);
  const changesRef = useRef<AiChange[]>([]);

  const { data: activeJobRows } = useLiveQuery(
    (q) =>
      q
        .from({ resume: db.collections.resume })
        .innerJoin({ job: db.collections.job }, ({ resume, job }) => eq(resume.jobId, job.id))
        .where(({ resume }) => eq(resume.id, activeResumeId))
        .select(({ job }) => ({
          id: job.id,
          company: job.company,
          title: job.title,
          description: job.description,
        })),
    [db, activeResumeId],
  );
  const activeJob = activeJobRows?.[0];

  const context: LocalToolContext = {
    db,
    userId,
    getActiveResumeId: () => activeResumeIdRef.current,
    setActiveResumeId(nextResumeId) {
      activeResumeIdRef.current = nextResumeId;
      setActiveResume({ pageResumeId: resumeId, id: nextResumeId });
    },
    openResume(nextResumeId, tab) {
      pendingOpenRef.current = { resumeId: nextResumeId, tab };
    },
    changes: changesRef.current,
  };

  const chat = useChat({
    threadId: `event-sourced-resume-ai:${resumeId}`,
    connection: fetchServerSentEvents("/api/ai/event-sourced-resume-tailor"),
    persistence: persistenceRef.current,
    tools: eventSourcedResumeAiClientTools,
    context,
    devtools: {
      name: "Event-sourced resume AI",
    },
    forwardedProps: {
      resumeId,
      activeResumeId,
      activeJobId: activeJob?.id,
      activeJobLabel: activeJob ? jobListLabel(activeJob) : undefined,
      systemPrompt,
      apiKey: settings?.apiKey,
      model: settings?.model,
      routing: settings?.routing,
    },
  });

  const { messages, isLoading, status, sessionGenerating } = chat;

  const approvals: ToolApprovalRequest[] = chat.interrupts.flatMap((interrupt) => {
    if (interrupt.kind !== "tool-approval") return [];
    const targetId = interrupt.originalArgs.resumeId || activeResumeId;
    return [
      {
        id: interrupt.id,
        toolName: interrupt.toolName,
        title: `Rewrite "${db.collections.resume.get(targetId)?.name ?? targetId}"`,
        detail:
          "The assistant wants to replace this résumé's whole content. Library items are reused where they match.",
        args: interrupt.originalArgs,
        approve: () => interrupt.resolveInterrupt(true),
        deny: () => interrupt.resolveInterrupt(false),
      },
    ];
  });

  useEffect(() => {
    const pending = pendingOpenRef.current;
    if (!pending || isLoading) return;
    pendingOpenRef.current = null;
    if (pending.resumeId !== resumeId) {
      handOverChatMessages(db, userId, pending.resumeId, messages);
    }
    void router.navigate({
      to: "/resumes/$resumeId",
      params: { resumeId: pending.resumeId },
      search: { tab: pending.tab },
    });
  }, [isLoading, db, messages, resumeId, router, userId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isLoading, status]);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !isReady) return;
    await chat.sendMessage(trimmed);
  }

  async function sendStarter(message: string) {
    if (isLoading || !isReady) return;
    await chat.sendMessage(message);
  }

  function clearLocalConversation() {
    chat.clear();
    setClearDialogOpen(false);
  }

  function editPastPrompt(message: UIMessage) {
    const text = getMessageText(message);
    if (!text) return;
    composerRef.current?.setText(text);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  async function resendPastPrompt(message: UIMessage) {
    const text = getMessageText(message);
    if (!text || isLoading || !isReady) return;
    await chat.sendMessage(text);
  }

  const activeModelLabel = settings?.model
    ? (settings.model.split("/").pop() ?? settings.model)
    : null;
  const routing = settings?.routing;
  const activeRoutingLabel =
    !routing || isLocalMode
      ? null
      : routing.mode === "auto"
        ? routing.sort
          ? `Auto · ${routing.sort}`
          : "Auto routing"
        : `${routing.mode === "official" ? "Official" : "Pinned"}: ${routing.providers.join(", ")}`;

  return {
    activeModelLabel,
    activeRoutingLabel,
    approvals,
    approvalsResuming: chat.resuming,
    chatErrorMessage: chat.error?.message ?? null,
    clearDialogOpen,
    clearLocalConversation,
    clearSettings,
    composerRef,
    editPastPrompt,
    endOfMessagesRef,
    handleClearDialogOpenChange: setClearDialogOpen,
    isLoading,
    isReady,
    messages,
    reload: chat.reload,
    resendPastPrompt,
    saveSettings,
    sendStarter,
    sendText,
    sessionChars: getSessionChars(messages),
    sessionGenerating,
    settings,
    settingsOpen,
    systemPrompt,
    saveSystemPrompt,
    resetSystemPrompt,
    isCustomSystemPrompt,
    setSettingsOpen,
    status,
    stop: chat.stop,
  };
}
