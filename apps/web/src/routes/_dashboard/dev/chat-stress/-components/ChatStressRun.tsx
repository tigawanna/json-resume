import { DotsPulse } from "@/components/loaders/DotsPulse";
import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { eventSourcedResumeAiClientTools } from "@/routes/_dashboard/-ai/-utils/client-tools";
import { createEventSourcedChatPersistence } from "@/routes/_dashboard/-ai/-utils/event-sourced-chat-persistence";
import { createLocalChatPersistence } from "@/routes/_dashboard/-ai/-utils/local-chat-persistence";
import { ResumeAiVirtualMessages } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiVirtualMessages";
import { ResumeAiChatActionsContext } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-chat-actions";
import { ResumeAiChatUI } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-chat-ui";
import { getSessionChars } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-message-utils";
import type { ChatClientPersistence } from "@tanstack/ai-client";
import { stream, useChat } from "@tanstack/ai-react";
import { Play, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFpsMonitor } from "../-hooks/use-fps-monitor";
import {
  fakeChatRun,
  type ChatStressConfig,
  type StressPersistence,
  type StressProgress,
} from "../-utils/fake-chat-stream";
import { FpsMeter } from "./FpsMeter";

/** The row the "local DB" mode writes. Local-only, and Clear removes it. */
const STRESS_CHAT_ID = "chat-stress";

type StressTools = typeof eventSourcedResumeAiClientTools;

function createStressPersistence(
  mode: StressPersistence,
  db: AppDb,
  userId: string,
): ChatClientPersistence<StressTools> {
  if (mode === "local-storage") {
    return createLocalChatPersistence<StressTools>(() => `${STRESS_CHAT_ID}:${userId || "local"}`);
  }
  if (mode === "local-db") {
    return createEventSourcedChatPersistence<StressTools>({
      getDb: () => db,
      getUserId: () => userId,
      resumeId: STRESS_CHAT_ID,
    });
  }
  return { getItem: () => null, setItem() {}, removeItem() {} };
}

interface ChatStressRunProps {
  config: ChatStressConfig;
  persistence: StressPersistence;
  onRunningChange: (running: boolean) => void;
}

/** Remount (via `key`) to switch persistence: `useChat` reads it once per thread. */
export function ChatStressRun({ config, persistence, onRunningChange }: ChatStressRunProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const userId = viewer.user?.id ?? "";
  const configRef = useRef(config);
  configRef.current = config;
  const progressRef = useRef<StressProgress>({
    emittedTokens: 0,
    startedAt: null,
    finishedAt: null,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [connection] = useState(() =>
    stream((_messages, _data, signal) =>
      fakeChatRun(configRef.current, progressRef.current, signal),
    ),
  );
  const [chatPersistence] = useState(() => createStressPersistence(persistence, db, userId));

  const chat = useChat({
    threadId: `${STRESS_CHAT_ID}:${persistence}`,
    connection,
    persistence: chatPersistence,
    tools: eventSourcedResumeAiClientTools,
    // The fake stream answers every tool call itself, so no tool runs against this.
    context: {
      db,
      userId,
      getActiveResumeId: () => null,
      setActiveResumeId() {},
      openResume() {},
      changes: [],
    },
    queue: "drop",
    devtools: { name: "Chat stress test" },
  });
  const { messages, isLoading, status } = chat;
  const sessionChars = getSessionChars(messages);

  const latest = useFpsMonitor({
    running: isLoading,
    progress: progressRef.current,
    tokensPerSecond: config.tokensPerSecond,
    totalTokens: config.totalTokens,
  });

  useEffect(() => {
    onRunningChange(isLoading);
  }, [isLoading, onRunningChange]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isLoading, status]);

  function start() {
    console.log("[chat-stress] start", { ...configRef.current, persistence });
    void chat.sendMessage(
      `Stress test: stream ${config.totalTokens.toLocaleString()} tokens at ${config.tokensPerSecond}/s.`,
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test="chat-stress-run">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={start}
          disabled={isLoading}
          data-test="chat-stress-start"
        >
          <Play className="size-4" /> Start
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={chat.stop}
          disabled={!isLoading}
          data-test="chat-stress-stop"
        >
          <Square className="size-3.5" /> Stop
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={chat.clear}
          disabled={isLoading || messages.length === 0}
          data-test="chat-stress-clear"
        >
          <Trash2 className="size-4" /> Clear
        </Button>
        <FpsMeter
          sample={latest}
          running={isLoading}
          totalTokens={config.totalTokens}
          messageCount={messages.length}
          sessionChars={sessionChars}
        />
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto rounded-xl border border-border/60 px-3 pb-2"
        data-test="chat-stress-messages"
      >
        <ResumeAiChatActionsContext
          value={{
            isBusy: isLoading,
            isReady: true,
            inProgressUserMessageId: undefined,
            onEdit() {},
            onResend() {},
          }}
        >
          <ResumeAiChatUI.Provider chat={chat}>
            <ResumeAiVirtualMessages
              scrollRef={scrollRef}
              queue={[]}
              onCancelQueued={() => {}}
              onSendQueuedNow={() => {}}
            />
          </ResumeAiChatUI.Provider>
        </ResumeAiChatActionsContext>
        {isLoading ? (
          <div className="shrink-0 px-4 py-2">
            <DotsPulse label="Streaming" />
          </div>
        ) : null}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
}
