import type { PromptAreaHandle } from "@/components/prompt-area/types";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type {
  DashboardToolContext,
  ResumeHandoff,
} from "@/features/agentic-tools/definitions/tool-context";
import { getSessionChars } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-message-utils";
import { isLocalMode } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-types";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { aiModelLabels } from "../-utils/ai-model-labels";
import { CONTINUE_AFTER_ERROR_PROMPT, failedRunHasReply } from "../-utils/chat-error";
import { INITIAL_CONTEXT_COMPACTION, reduceContextCompaction } from "../-utils/context-compaction";
import { dashboardAssistantClientTools } from "../-utils/dashboard-client-tools";
import { appendChatMessages } from "../-utils/event-sourced-chat-persistence";
import { isApiKeyErrorMessage } from "../-utils/is-api-key-error";
import { createLocalChatPersistence } from "../-utils/local-chat-persistence";
import {
  buildHandoffMessage,
  handoffPrompt,
  isHandoffMessage,
  queueHandoffPrompt,
} from "../-utils/resume-handoff";
import { useEventSourcedAiSettings } from "./use-event-sourced-ai-settings";
import { useSendPastApprovals } from "./use-send-past-approvals";

function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The dashboard assistant's chat. Lives in the dashboard layout, so it survives navigation. */
export function useDashboardAssistantChat(options: { onHandedOff: () => void }) {
  const { settings, slopGuard } = useEventSourcedAiSettings();
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const router = useRouter();
  const composerRef = useRef<PromptAreaHandle>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const userId = viewer.user?.id ?? "";
  const isReady = isLocalMode || !!settings;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const [persistence] = useState(() =>
    createLocalChatPersistence<typeof dashboardAssistantClientTools>(
      () => `dashboard-assistant:${userIdRef.current || "local"}`,
    ),
  );
  const pendingHandoffRef = useRef<ResumeHandoff | null>(null);
  const changesRef = useRef<DashboardToolContext["changes"]>([]);
  const [turn, setTurn] = useState(0);
  const [compaction, setCompaction] = useState(INITIAL_CONTEXT_COMPACTION);

  const context: DashboardToolContext = {
    db,
    userId,
    getActiveResumeId: () => null,
    setActiveResumeId() {},
    openResume() {},
    changes: changesRef.current,
    handOff(handoff) {
      pendingHandoffRef.current = handoff;
    },
  };

  const chat = useChat({
    threadId: `dashboard-assistant:${userId || "local"}`,
    connection: fetchServerSentEvents("/api/ai/dashboard-assistant"),
    persistence,
    tools: dashboardAssistantClientTools,
    context,
    queue: "drop",
    devtools: { name: "Dashboard assistant" },
    onCustomEvent(eventType, data) {
      setCompaction((state) => reduceContextCompaction(state, eventType, data, turn));
    },
    forwardedProps: {
      today: localDate(),
      slopGuard,
      apiKey: settings?.apiKey,
      model: settings?.model,
      routing: settings?.routing,
    },
  });

  const { messages, isLoading, status } = chat;

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
  const { onHandedOff } = options;

  useEffect(() => {
    const handoff = pendingHandoffRef.current;
    if (!handoff || isLoading) return;
    pendingHandoffRef.current = null;
    appendChatMessages(db, userId, handoff.resumeId, [buildHandoffMessage(handoff)], {
      replaceTrailing: isHandoffMessage,
    });
    queueHandoffPrompt(handoff.resumeId, handoffPrompt(handoff));
    onHandedOff();
    void router.navigate({
      to: "/resumes/$resumeId",
      params: { resumeId: handoff.resumeId },
      search: { tab: "ai" },
    });
  }, [isLoading, db, onHandedOff, router, userId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isLoading, status]);

  const { awaitingApproval, send } = useSendPastApprovals(chat);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !isReady) return;
    setTurn((value) => value + 1);
    await send(trimmed);
  }

  async function retryLastRun() {
    if (isLoading || !isReady) return;
    setTurn((value) => value + 1);
    if (failedRunHasReply(messages)) await send(CONTINUE_AFTER_ERROR_PROMPT);
    else await chat.reload();
  }

  function clear() {
    setCompaction(INITIAL_CONTEXT_COMPACTION);
    chat.clear();
  }

  const errorMessage = chat.error?.message ?? null;
  const { modelLabel, routingLabel } = aiModelLabels(settings);

  return {
    activeModelLabel: modelLabel,
    activeRoutingLabel: routingLabel,
    apiKeyRejected: isApiKeyErrorMessage(errorMessage),
    awaitingApproval,
    chat,
    clear,
    compacting: compaction.running?.turn === turn,
    /** The latest compaction that shrank the history sent to the model. */
    lastCompaction: compaction.last,
    compactedThisTurn: compaction.last?.turn === turn,
    composerRef,
    endOfMessagesRef,
    errorMessage,
    isLoading,
    isReady,
    messages,
    retryLastRun,
    sendText,
    sessionChars: getSessionChars(messages),
    sessionGenerating: chat.sessionGenerating,
    settings,
    status,
    stop: chat.stop,
  };
}
