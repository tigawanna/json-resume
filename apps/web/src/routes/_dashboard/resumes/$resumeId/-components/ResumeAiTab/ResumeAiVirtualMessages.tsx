import { withoutStackedHandoffs } from "@/routes/_dashboard/-ai/-utils/resume-handoff";
import type { MessageProps } from "@tanstack/ai-react/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";
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

function VirtualMessageRows({ messages, scrollRef }: VirtualMessageRowsProps) {
  // The virtualizer is one mutable instance; compiler memoization would cache its stale items.
  "use no memo";
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 160,
    getItemKey: (index) => messages[index]?.id ?? index,
    gap: 20,
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
        const message = messages[item.index];
        if (!message) return null;
        return (
          <div
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            <ResumeAiChatUI.Message message={message} />
          </div>
        );
      })}
    </div>
  );
}
