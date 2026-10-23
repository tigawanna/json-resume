import { chatMessagesEqual } from "@/routes/_dashboard/-ai/-utils/chat-message-equal";
import { withoutStackedHandoffs } from "@/routes/_dashboard/-ai/-utils/resume-handoff";
import type { MessageProps } from "@tanstack/ai-react/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, type RefObject } from "react";
import type { ResumeAiChat, ResumeAiChatOptions } from "./resume-ai-chat-options";
import { ResumeAiChatUI } from "./resume-ai-chat-ui";

type ResumeAiChatMessage = MessageProps<ResumeAiChatOptions>["message"];

type QueuedPrompt = ResumeAiChat["queue"][number];

interface ResumeAiVirtualMessagesProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  queue: ResumeAiChat["queue"];
  onCancelQueued: (id: string) => void;
  onSendQueuedNow: (item: QueuedPrompt) => void;
}

/** Renders only the messages near the viewport. Must sit inside `ResumeAiChatUI.Provider`. */
export function ResumeAiVirtualMessages({
  scrollRef,
  queue,
  onCancelQueued,
  onSendQueuedNow,
}: ResumeAiVirtualMessagesProps) {
  return (
    <ResumeAiChatUI.Messages>
      {(messages) => (
        <VirtualMessageRows
          messages={withoutStackedHandoffs(messages)}
          queue={queue}
          scrollRef={scrollRef}
          onCancelQueued={onCancelQueued}
          onSendQueuedNow={onSendQueuedNow}
        />
      )}
    </ResumeAiChatUI.Messages>
  );
}

interface VirtualMessageRowsProps extends ResumeAiVirtualMessagesProps {
  messages: ReadonlyArray<ResumeAiChatMessage>;
}

type TranscriptRow =
  | {
      kind: "message";
      key: string;
      message: ResumeAiChatMessage;
      /** Text rows grow while streaming. A collapsed tool row keeps its estimate. */
      measure: boolean;
    }
  | { kind: "queued"; key: string; item: QueuedPrompt };

type ChatPart = ResumeAiChatMessage["parts"][number];

const TOOL_ROW_HEIGHT = 44;

function transcriptRows(
  messages: ReadonlyArray<ResumeAiChatMessage>,
  queue: ResumeAiChat["queue"],
): TranscriptRow[] {
  const rows: TranscriptRow[] = [];
  for (const message of messages) {
    if (message.role === "user" || message.parts.length <= 1) {
      rows.push({ kind: "message", key: message.id, message, measure: true });
      continue;
    }

    const callIds = new Set(
      message.parts.flatMap((part) => (part.type === "tool-call" ? [part.id] : [])),
    );

    message.parts.forEach((part, index) => {
      if (part.type === "tool-result" && callIds.has(part.toolCallId)) return;

      const parts: ChatPart[] = [part];
      if (part.type === "tool-call") {
        const result = message.parts.find(
          (other) => other.type === "tool-result" && other.toolCallId === part.id,
        );
        if (result) parts.push(result);
      }

      rows.push({
        kind: "message",
        key: `${message.id}:${partKey(part, index)}`,
        message: { ...message, parts },
        measure: part.type !== "tool-call" || measuredTool(part.name),
      });
    });
  }
  for (const item of queue) {
    rows.push({ kind: "queued", key: `queued:${item.id}`, item });
  }
  return rows;
}

/**
 * The chat UI rebuilds its interrupt list on every snapshot, so its own memo never holds.
 * Comparing the message here skips that walk for rows whose parts have not changed.
 */
const StableResumeAiMessage = memo(
  function StableResumeAiMessage({ message }: { message: ResumeAiChatMessage }) {
    return <ResumeAiChatUI.Message message={message} />;
  },
  (prev, next) => chatMessagesEqual(prev.message, next.message),
);

function measuredTool(name: string) {
  return name === "clone_resume" || name === "create_resume" || name === "tailor_resume_for_job";
}

function partKey(part: ChatPart, index: number) {
  if (part.type === "tool-call") return part.id;
  if (part.type === "tool-result") return part.toolCallId;
  if ("id" in part && typeof part.id === "string") return part.id;
  return String(index);
}

function VirtualMessageRows({
  messages,
  queue,
  scrollRef,
  onCancelQueued,
  onSendQueuedNow,
}: VirtualMessageRowsProps) {
  // The virtualizer is one mutable instance; compiler memoization would cache its stale items.
  "use no memo";
  const rows = transcriptRows(messages, queue);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row || row.kind === "queued") return 96;
      return row.measure ? 160 : TOOL_ROW_HEIGHT;
    },
    getItemKey: (index) => rows[index]?.key ?? index,
    gap: 8,
    paddingStart: 8,
    overscan: 4,
    anchorTo: "end",
    followOnAppend: true,
  });

  return (
    <div
      className="relative w-full shrink-0"
      style={{ height: virtualizer.getTotalSize() }}
      data-test="resume-ai-virtual-messages"
    >
      {virtualizer.getVirtualItems().map((item) => {
        const row = rows[item.index];
        if (!row) return null;
        return (
          <div
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            {row.kind === "queued" ? (
              <QueuedPromptRow
                item={row.item}
                onCancel={() => onCancelQueued(row.item.id)}
                onSendNow={() => onSendQueuedNow(row.item)}
              />
            ) : (
              <StableResumeAiMessage message={row.message} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function queuedText(content: QueuedPrompt["content"]) {
  return typeof content === "string" ? content : "[attachment]";
}

function QueuedPromptRow({
  item,
  onCancel,
  onSendNow,
}: {
  item: QueuedPrompt;
  onCancel: () => void;
  onSendNow: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-end gap-1" data-test="resume-ai-queued-prompt">
      <div className="max-w-[min(44rem,calc(100%-3rem))] rounded-2xl rounded-tr-md bg-primary/10 px-4 py-3 text-sm ring-1 ring-[color-mix(in_oklch,var(--color-primary)_34%,transparent)]">
        <p className="wrap-break-word whitespace-pre-wrap">{queuedText(item.content)}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Sends when this reply finishes</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={onSendNow}
          data-test="resume-ai-send-queued-now"
        >
          Send now
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={onCancel}
          data-test="resume-ai-cancel-queued"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
