import type { PromptAreaHandle } from "@/components/prompt-area/types";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ResumeExperience } from "@/data-access-layer/event-sourced/schemas";
import {
  limitExperienceSnapshot,
  type ExperienceGroupSnapshot,
} from "@/features/agentic-tools/experience-snapshot";
import {
  CONTINUE_AFTER_ERROR_PROMPT,
  STALLED_INTERRUPT_MESSAGE,
  failedRunHasReply,
} from "@/lib/openrouter/chat-error";
import { isApiKeyErrorMessage } from "@/lib/openrouter/is-api-key-error";
import { aiModelLabels } from "@/lib/openrouter/model-labels";
import { createLocalChatPersistence } from "@/routes/_dashboard/-ai/-utils/local-chat-persistence";
import { useEventSourcedAiSettings } from "@/routes/_dashboard/-ai/-hooks/use-event-sourced-ai-settings";
import { useSendPastApprovals } from "@/routes/_dashboard/-ai/-hooks/use-send-past-approvals";
import { getSessionChars } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-message-utils";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useRef, useState } from "react";
import { experienceAiClientTools } from "../-utils/experience-ai-tools";

interface UseExperienceAiOptions {
  /** Titles of the open company + period group, in display order. */
  titles: ResumeExperience[];
  /** Stable company + period key; scopes the thread and its stored conversation. */
  groupKey: string;
}

/**
 * The experience detail page's assistant, wired like the resume builder's AI
 * tab: same settings sheet, same OpenRouter routing, tools running against the
 * local database inside this company + period group only.
 */
export function useExperienceAi({ titles, groupKey }: UseExperienceAiOptions) {
  const { settings } = useEventSourcedAiSettings();
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const composerRef = useRef<PromptAreaHandle>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const userId = viewer.user?.id ?? "";
  const isReady = !!settings;

  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const groupKeyRef = useRef(groupKey);
  groupKeyRef.current = groupKey;
  const [persistence] = useState(() =>
    createLocalChatPersistence<typeof experienceAiClientTools>(
      () => `experience-ai:${groupKeyRef.current}`,
    ),
  );

  const titleIds = titles.map((title) => title.id);
  const titleIdsKey = titleIds.join(",");
  const titleIdsRef = useRef(titleIds);
  titleIdsRef.current = titleIds;

  const { data: bulletRows } = useLiveQuery(
    (query) =>
      titleIds.length === 0
        ? undefined
        : query
            .from({ bullet: db.collections.resumeExperienceBullet })
            .where(({ bullet }) => inArray(bullet.experienceId, titleIds)),
    [titleIdsKey],
  );

  const snapshot: ExperienceGroupSnapshot = {
    company: titles[0]?.company ?? "",
    startDate: titles[0]?.startDate ?? "",
    endDate: titles[0]?.endDate ?? "",
    titles: titles.map((title) => ({
      id: title.id,
      role: title.role,
      startDate: title.startDate,
      endDate: title.endDate,
      location: title.location,
      bullets: (bulletRows ?? [])
        .filter((bullet) => bullet.experienceId === title.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((bullet) => ({ id: bullet.id, text: bullet.text })),
    })),
  };

  const context = {
    db,
    userId,
    getGroupTitleIds: () => titleIdsRef.current,
  };

  const chat = useChat({
    threadId: `experience-ai:${groupKey}`,
    connection: fetchServerSentEvents("/api/ai/experience-agent"),
    persistence,
    tools: experienceAiClientTools,
    context,
    queue: { whenBusy: "queue", drain: "fifo" },
    devtools: { name: "Experience assistant" },
    forwardedProps: {
      snapshot: limitExperienceSnapshot(snapshot),
      apiKey: settings?.apiKey,
      model: settings?.model,
      routing: settings?.routing,
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

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isLoading, status]);

  const { awaitingApproval, releaseStuckRun, send, stalled } = useSendPastApprovals(chat);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !isReady) return false;
    return send(trimmed);
  }

  async function retryLastRun() {
    if (isLoading || !isReady) return;
    releaseStuckRun();
    if (failedRunHasReply(messages)) await send(CONTINUE_AFTER_ERROR_PROMPT);
    else await chat.reload();
  }

  const errorMessage = stalled ? STALLED_INTERRUPT_MESSAGE : (chat.error?.message ?? null);
  const { modelLabel, routingLabel } = aiModelLabels(settings);

  return {
    activeModelLabel: modelLabel,
    activeRoutingLabel: routingLabel,
    apiKeyRejected: isApiKeyErrorMessage(errorMessage),
    awaitingApproval,
    chat,
    clear: chat.clear,
    composerRef,
    endOfMessagesRef,
    errorMessage,
    isLoading,
    isReady,
    messages,
    retryLastRun,
    sendText,
    sessionChars: getSessionChars(messages),
    sessionGenerating,
    settings,
    status,
    stop: chat.stop,
  };
}
