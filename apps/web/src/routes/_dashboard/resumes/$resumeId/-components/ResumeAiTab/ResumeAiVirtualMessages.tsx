import { chatMessagesEqual } from "@/routes/_dashboard/-ai/-utils/chat-message-equal";
import { withoutStackedHandoffs } from "@/routes/_dashboard/-ai/-utils/resume-handoff";
import type { MessageProps } from "@tanstack/ai-react/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, type RefObject } from "react";
import type { ResumeAiChatOptions } from "./resume-ai-chat-options";
import { ResumeAiChatUI } from "./resume-ai-chat-ui";

type ResumeAiChatMessage = MessageProps<ResumeAiChatOptions>["message"];

interface ResumeAiVirtualMessagesProps {
  scrollRef: RefObject<HTMLDivElement | null>;
}

/** Renders only the messages near the viewport. Must sit inside `ResumeAiChatUI.Provider`. */
export function ResumeAiVirtualMessages({ scrollRef }: ResumeAiVirtualMessagesProps) {
  return (
    <ResumeAiChatUI.Messages>
      {(messages) => (
        <VirtualMessageRows messages={withoutStackedHandoffs(messages)} scrollRef={scrollRef} />
      )}
    </ResumeAiChatUI.Messages>
  );
}

interface VirtualMessageRowsProps extends ResumeAiVirtualMessagesProps {
  messages: ReadonlyArray<ResumeAiChatMessage>;
}

type ChatPart = ResumeAiChatMessage["parts"][number];

interface TranscriptRow {
  key: string;
  message: ResumeAiChatMessage;
  /** Text rows grow while streaming. A collapsed tool row keeps its estimate. */
  measure: boolean;
}

const TOOL_ROW_HEIGHT = 44;

function transcriptRows(messages: ReadonlyArray<ResumeAiChatMessage>): TranscriptRow[] {
  const rows: TranscriptRow[] = [];
  for (const message of messages) {
    if (message.role === "user" || message.parts.length <= 1) {
      rows.push({ key: message.id, message, measure: true });
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
        key: `${message.id}:${partKey(part, index)}`,
        message: { ...message, parts },
        measure: part.type !== "tool-call" || measuredTool(part.name),
      });
    });
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

function VirtualMessageRows({ messages, scrollRef }: VirtualMessageRowsProps) {
  // The virtualizer is one mutable instance; compiler memoization would cache its stale items.
  "use no memo";
  const rows = transcriptRows(messages);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index]?.measure ? 160 : TOOL_ROW_HEIGHT),
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
            ref={row.measure ? virtualizer.measureElement : undefined}
            data-index={item.index}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            <StableResumeAiMessage message={row.message} />
          </div>
        );
      })}
    </div>
  );
}
