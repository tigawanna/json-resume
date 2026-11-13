import type { PromptAreaHandle } from "@/components/prompt-area/types";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type {
  DashboardToolContext,
  ResumeHandoff,
} from "@/features/agentic-tools/definitions/tool-context";
import { getSessionChars } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-message-utils";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CONTINUE_AFTER_ERROR_PROMPT,
  STALLED_INTERRUPT_MESSAGE,
  failedRunHasReply,
} from "@/lib/openrouter/chat-error";
import { isApiKeyErrorMessage } from "@/lib/openrouter/is-api-key-error";
import { aiModelLabels } from "@/lib/openrouter/model-labels";
import { newId } from "@/routes/_dashboard/-utils/row-helpers";
import { INITIAL_CONTEXT_COMPACTION, reduceContextCompaction } from "../-utils/context-compaction";
import { pageAssistantClientTools } from "../-utils/page-assistant-client-tools";
import { appendChatMessages } from "../-utils/event-sourced-chat-persistence";
import { createLocalChatPersistence } from "../-utils/local-chat-persistence";
import {
  assistantRouteKey,
  assistantThreadId,
  conversationIdFromThread,
  conversationStateKey,
  createConversation,
  deleteConversation,
  firstUserTitle,
  loadConversations,
  migrateLegacyConversation,
  newestForRoute,
  touchConversation,
  type AssistantConversation,
} from "../-utils/assistant-conversations";
import { pageHeader, resolvePageContext } from "../-utils/page-context";
import { experienceGroup, experienceSnapshotText, readFocus } from "../-utils/page-focus";
import {
  buildHandoffMessage,
  handoffPrompt,
  isHandoffMessage,
  queueHandoffPrompt,
} from "../-utils/resume-handoff";
import { useEventSourcedAiSettings } from "./use-event-sourced-ai-settings";
import { useAssistantSkillInstructions } from "./use-assistant-skill-instructions";
import { useSendPastApprovals } from "./use-send-past-approvals";

function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function stringParams(params: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export const OPEN_ASSISTANT_EVENT = "dashboard-assistant-open";

export function openDashboardAssistant() {
  window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
}

/** The dashboard assistant's chat. Lives in the dashboard layout, so it survives navigation. */
export function useDashboardAssistantChat(options: { onHandedOff: () => void }) {
  const { settings, slopGuard } = useEventSourcedAiSettings();
  const dashboardSkills = useAssistantSkillInstructions("dashboard");
  const experienceSkills = useAssistantSkillInstructions("experience");
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const router = useRouter();
  const match = useRouterState({
    select: (state) => {
      const leaf = state.matches[state.matches.length - 1];
      return {
        routeId: leaf?.routeId ?? "",
        pathname: state.location.pathname,
        params: stringParams(leaf?.params ?? {}),
      };
    },
  });
  const composerRef = useRef<PromptAreaHandle>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const userId = viewer.user?.id ?? "";
  const isReady = !!settings;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const activeIdRef = useRef("");
  const groupIdsRef = useRef<string[]>([]);
  const packRef = useRef(resolvePageContext(match.routeId).toolPack);
  const [persistence] = useState(() =>
    createLocalChatPersistence<typeof pageAssistantClientTools>(
      () => conversationStateKey(userIdRef.current, activeIdRef.current),
      {
        keyForThread: (threadId) =>
          conversationStateKey(userIdRef.current, conversationIdFromThread(threadId)),
      },
    ),
  );
  const pendingHandoffRef = useRef<ResumeHandoff | null>(null);
  const changesRef = useRef<DashboardToolContext["changes"]>([]);
  const [turn, setTurn] = useState(0);
  const [compaction, setCompaction] = useState(INITIAL_CONTEXT_COMPACTION);
  const [activeId, setActiveId] = useState("");
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const indexedUserRef = useRef<string | null>(null);
  const pinnedRef = useRef(false);
  const appliedRouteRef = useRef<string | null>(null);
  const queuedRouteRef = useRef<string | null>(null);

  const page = resolvePageContext(match.routeId);
  const group =
    page.toolPack === "experience" ? experienceGroup(db, match.params.experienceId) : null;
  groupIdsRef.current = group?.titles.map((title) => title.id) ?? [];
  packRef.current = page.toolPack;
  const focus = readFocus(
    db,
    page.focus.collection,
    page.focus.param ? match.params[page.focus.param] : undefined,
  );
  const routeKey = assistantRouteKey(match.routeId, match.params, group?.key ?? null);
  const routeLabel = pageHeader(page.label, group?.label ?? focus?.title ?? null);
  const routeKeyRef = useRef(routeKey);
  const routeLabelRef = useRef(routeLabel);
  routeKeyRef.current = routeKey;
  routeLabelRef.current = routeLabel;

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
    getGroupTitleIds: () => groupIdsRef.current,
    getActiveConversationId: () => activeIdRef.current,
    getToolPack: () => packRef.current,
  };

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ?? null;
  const skillInstructions = page.toolPack === "experience" ? experienceSkills : dashboardSkills;

  const chat = useChat({
    threadId: assistantThreadId(activeId || "pending"),
    connection: fetchServerSentEvents("/api/ai/dashboard-assistant"),
    persistence,
    tools: pageAssistantClientTools,
    context,
    queue: "drop",
    devtools: { name: "Dashboard assistant" },
    onCustomEvent(eventType, data) {
      setCompaction((state) => reduceContextCompaction(state, eventType, data, turn));
    },
    forwardedProps: {
      today: localDate(),
      slopGuard,
      skillInstructions,
      apiKey: settings?.apiKey,
      model: settings?.model,
      routing: settings?.routing,
      conversationId: activeId,
      page: {
        routeId: page.routeId,
        pathname: match.pathname,
        label: page.label,
        summary: page.summary,
        instructions: page.instructions,
        toolPack: page.toolPack,
        params: match.params,
        focus,
        conversationStartedOn: activeConversation?.routeLabel ?? routeLabel,
        experienceSnapshot:
          page.toolPack === "experience"
            ? experienceSnapshotText(db, match.params.experienceId)
            : "",
      },
    },
  });

  const { messages, isLoading, status } = chat;

  function refreshIndex() {
    setConversations(loadConversations(localStorage, userIdRef.current));
  }

  function activate(id: string) {
    persistence.flush();
    activeIdRef.current = id;
    setActiveId(id);
    refreshIndex();
  }

  useEffect(() => {
    if (indexedUserRef.current !== userId) {
      indexedUserRef.current = userId;
      appliedRouteRef.current = null;
    }
    if (isLoading) {
      queuedRouteRef.current = routeKey;
      return;
    }
    const nextKey = queuedRouteRef.current ?? routeKey;
    queuedRouteRef.current = null;
    if (pinnedRef.current && appliedRouteRef.current === nextKey && activeIdRef.current) {
      const current = loadConversations(localStorage, userId).find(
        (conversation) => conversation.id === activeIdRef.current,
      );
      if (current && current.routeLabel !== routeLabel && current.routeKey === nextKey) {
        touchConversation(localStorage, userId, current.id, { routeLabel, now: current.updatedAt });
        refreshIndex();
      }
      return;
    }
    if (appliedRouteRef.current === nextKey && activeIdRef.current) {
      const current = loadConversations(localStorage, userId).find(
        (conversation) => conversation.id === activeIdRef.current,
      );
      if (current && current.routeKey === nextKey && current.routeLabel !== routeLabel) {
        touchConversation(localStorage, userId, current.id, { routeLabel, now: current.updatedAt });
        refreshIndex();
      }
      return;
    }
    pinnedRef.current = false;
    appliedRouteRef.current = nextKey;
    migrateLegacyConversation(localStorage, userId);
    const list = loadConversations(localStorage, userId);
    const newest = newestForRoute(list, nextKey);
    const next =
      newest ??
      createConversation(localStorage, userId, {
        id: newId(),
        routeKey: nextKey,
        routeLabel,
      });
    activate(next.id);
  }, [routeKey, routeLabel, isLoading, userId]);

  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    const title = firstUserTitle(messages);
    const current = conversations.find((conversation) => conversation.id === activeId);
    if (!current) return;
    const nextTitle = title && current.title === current.routeLabel ? title : current.title;
    if (nextTitle === current.title && current.messageCount === messages.length) return;
    touchConversation(localStorage, userId, activeId, {
      title: nextTitle,
      messageCount: messages.length,
    });
    refreshIndex();
  }, [messages, activeId, userId, conversations]);

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
  }, [messages.length, isLoading, status, activeId]);

  const { awaitingApproval, releaseStuckRun, send, stalled } = useSendPastApprovals(chat);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !isReady || !activeId) return false;
    setTurn((value) => value + 1);
    return send(trimmed);
  }

  async function retryLastRun() {
    if (isLoading || !isReady) return;
    setTurn((value) => value + 1);
    releaseStuckRun();
    if (failedRunHasReply(messages)) await send(CONTINUE_AFTER_ERROR_PROMPT);
    else await chat.reload();
  }

  function clear() {
    if (activeIdRef.current)
      deleteConversation(localStorage, userIdRef.current, activeIdRef.current);
    const next = createConversation(localStorage, userIdRef.current, {
      id: newId(),
      routeKey: routeKeyRef.current,
      routeLabel: routeLabelRef.current,
    });
    setCompaction(INITIAL_CONTEXT_COMPACTION);
    pinnedRef.current = false;
    activate(next.id);
  }

  function startNew() {
    const next = createConversation(localStorage, userIdRef.current, {
      id: newId(),
      routeKey: routeKeyRef.current,
      routeLabel: routeLabelRef.current,
    });
    pinnedRef.current = false;
    setCompaction(INITIAL_CONTEXT_COMPACTION);
    activate(next.id);
  }

  function selectConversation(id: string) {
    pinnedRef.current = true;
    setCompaction(INITIAL_CONTEXT_COMPACTION);
    activate(id);
  }

  const errorMessage = stalled ? STALLED_INTERRUPT_MESSAGE : (chat.error?.message ?? null);
  const { modelLabel, routingLabel } = aiModelLabels(settings);

  return {
    activeModelLabel: modelLabel,
    activeRoutingLabel: routingLabel,
    apiKeyRejected: isApiKeyErrorMessage(errorMessage),
    awaitingApproval,
    chat,
    clear,
    conversations,
    selectConversation,
    startNew,
    activeConversationId: activeId,
    page,
    routeLabel,
    suggestions: page.suggestions,
    compacting: compaction.running?.turn === turn,
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
