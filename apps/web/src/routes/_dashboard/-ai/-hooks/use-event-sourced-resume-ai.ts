import { useViewer } from "@/data-access-layer/auth/viewer";
import { jobListLabel } from "@/data-access-layer/event-sourced/rows/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { PromptAreaHandle } from "@/components/prompt-area/types";
import { fetchServerSentEvents, useChat, type UIMessage } from "@tanstack/ai-react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CONTINUE_AFTER_ERROR_PROMPT, failedRunHasReply } from "@/lib/openrouter/chat-error";
import { aiModelLabels } from "@/lib/openrouter/model-labels";
import { eventSourcedResumeAiClientTools } from "../-utils/client-tools";
import {
  createEventSourcedChatPersistence,
  handOverChatMessages,
} from "../-utils/event-sourced-chat-persistence";
import type { AiChange, LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import type { WorkbenchTab } from "@/features/agentic-tools/resume-tool-schemas";
import { takeHandoffPrompt } from "../-utils/resume-handoff";
import { snapshotResumeJson } from "../-utils/resume-json-diff";
import { useEventSourcedAiSettings } from "./use-event-sourced-ai-settings";
import { useSendPastApprovals } from "./use-send-past-approvals";
import {
  getMessageText,
  getSessionChars,
} from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-message-utils";
import {
  useResumeWorkbench,
  useResumeWorkbenchActions,
} from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchProvider";

export function useEventSourcedResumeAiChat(options?: {
  /** Dev chat lab: same client, a scripted endpoint instead of the model. */
  connection?: string;
  labPreset?: string;
}) {
  const { settings, systemPrompt, slopGuard } = useEventSourcedAiSettings();
  const resumeId = useResumeWorkbench((state) => state.resumeId);
  const activeResumeId = useResumeWorkbench((state) => state.ai.activeResumeId);
  const workbench = useResumeWorkbenchActions();
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const router = useRouter();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<PromptAreaHandle>(null);
  const isReady = options?.connection ? true : !!settings;
  const userId = viewer.user?.id ?? "";
  const dbRef = useRef(db);
  const userIdRef = useRef(userId);
  dbRef.current = db;
  userIdRef.current = userId;
  const [persistence] = useState(() =>
    createEventSourcedChatPersistence<typeof eventSourcedResumeAiClientTools>({
      getDb: () => dbRef.current,
      getUserId: () => userIdRef.current,
      resumeId: options?.connection ? `chat-lab:${resumeId}` : resumeId,
    }),
  );

  const pendingOpenRef = useRef<{ resumeId: string; tab: WorkbenchTab } | null>(null);
  const changesRef = useRef<AiChange[]>([]);

  const { data: activeJobRows } = useLiveQuery(
    (q) =>
      activeResumeId === null
        ? undefined
        : q
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
  const { data: activeResumeRows } = useLiveQuery(
    (q) =>
      activeResumeId === null
        ? undefined
        : q
            .from({ resume: db.collections.resume })
            .where(({ resume }) => eq(resume.id, activeResumeId))
            .select(({ resume }) => ({ id: resume.id, name: resume.name })),
    [db, activeResumeId],
  );
  const activeResume =
    activeResumeId === null
      ? null
      : {
          id: activeResumeId,
          name: activeResumeRows?.[0]?.name ?? "Untitled résumé",
          isPageResume: activeResumeId === resumeId,
        };

  const context: LocalToolContext = {
    db,
    userId,
    getActiveResumeId: workbench.getActiveResumeId,
    setActiveResumeId(nextResumeId) {
      workbench.setActiveResume(nextResumeId, snapshotResumeJson(dbRef.current, nextResumeId));
    },
    openResume(nextResumeId, tab) {
      pendingOpenRef.current = { resumeId: nextResumeId, tab };
    },
    changes: changesRef.current,
  };

  const chat = useChat({
    threadId: options?.connection ? `chat-lab:${resumeId}` : `event-sourced-resume-ai:${resumeId}`,
    connection: fetchServerSentEvents(options?.connection ?? "/api/ai/event-sourced-resume-tailor"),
    persistence,
    tools: eventSourcedResumeAiClientTools,
    context,
    // ai-client 0.39 loses messages queued during client-tool rounds; see todos/chat-prompt-queue.md.
    queue: "drop",
    devtools: {
      name: "Event-sourced resume AI",
    },
    forwardedProps: {
      resumeId,
      activeResumeId,
      activeJobId: activeJob?.id,
      activeJobLabel: activeJob ? jobListLabel(activeJob) : undefined,
      systemPrompt,
      slopGuard,
      apiKey: settings?.apiKey,
      model: settings?.model,
      routing: settings?.routing,
      ...(options?.labPreset ? { labPreset: options.labPreset } : {}),
    },
  });

  const { messages, isLoading, status, sessionGenerating } = chat;

  useEffect(() => {
    if (!isLoading) persistence.flush();
  }, [isLoading, persistence]);

  useEffect(() => {
    window.addEventListener("pagehide", persistence.flush);
    return () => {
      window.removeEventListener("pagehide", persistence.flush);
      persistence.flush();
    };
  }, [persistence]);

  // The diff start is taken when a prompt's run begins, so sends from any entry point get one.
  const latestUserMessageId = messages.filter((message) => message.role === "user").at(-1)?.id;
  const baselinedMessageIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isLoading || !latestUserMessageId) return;
    if (baselinedMessageIdRef.current === latestUserMessageId) return;
    baselinedMessageIdRef.current = latestUserMessageId;
    const id = workbench.getActiveResumeId();
    workbench.startTurn(id === null ? null : snapshotResumeJson(dbRef.current, id));
  }, [isLoading, latestUserMessageId, workbench]);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const prompt = takeHandoffPrompt(resumeId);
      if (!prompt) return;
      composerRef.current?.setText(prompt);
      composerRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resumeId]);

  const { awaitingApproval, send } = useSendPastApprovals(chat);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !isReady) return;
    await send(trimmed);
  }

  async function retryLastRun() {
    if (isLoading || !isReady) return;
    if (failedRunHasReply(messages)) await send(CONTINUE_AFTER_ERROR_PROMPT);
    else await chat.reload();
  }

  function clearLocalConversation() {
    chat.clear();
    workbench.clearTurns();
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
    await send(text);
  }

  const { modelLabel: activeModelLabel, routingLabel: activeRoutingLabel } =
    aiModelLabels(settings);

  return {
    activeModelLabel,
    activeResume,
    activeRoutingLabel,
    awaitingApproval,
    chat,
    chatErrorMessage: chat.error?.message ?? null,
    clearLocalConversation,
    composerRef,
    editPastPrompt,
    endOfMessagesRef,
    isLoading,
    isReady,
    messages,
    reload: chat.reload,
    resendPastPrompt,
    retryLastRun,
    sendText,
    sessionChars: getSessionChars(messages),
    sessionGenerating,
    settings,
    status,
    stop: chat.stop,
  };
}
