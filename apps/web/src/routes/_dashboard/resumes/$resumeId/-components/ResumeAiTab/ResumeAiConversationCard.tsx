import { DotsPulse } from "@/components/loaders/DotsPulse";
import { ResumeAiPromptComposer } from "./ResumeAiPromptComposer";
import { ResumeAiVirtualMessages } from "./ResumeAiVirtualMessages";
import { ResumeAiChatActionsContext } from "./resume-ai-chat-actions";
import type { ResumeAiChat } from "./resume-ai-chat-options";
import { ResumeAiChatUI } from "./resume-ai-chat-ui";
import type { ResumeAiMessageAction } from "./resume-ai-types";
import { DIRECTIVES } from "./resume-ai-directives";
import { useRef, type ComponentProps, type RefObject } from "react";

interface ResumeAiConversationCardProps extends Omit<
  ComponentProps<typeof ResumeAiPromptComposer>,
  "hasMessages"
> {
  chat: ResumeAiChat;
  endOfMessagesRef: RefObject<HTMLDivElement | null>;
  historyPending: boolean;
  isReady: boolean;
  onEditPastPrompt: ResumeAiMessageAction;
  onResendPastPrompt: ResumeAiMessageAction;
}

/** Fills a fixed-height parent: messages scroll, the composer stays pinned below them. */
export function ResumeAiConversationCard({
  chat,
  endOfMessagesRef,
  historyPending,
  isReady,
  onEditPastPrompt,
  onResendPastPrompt,
  ...composerProps
}: ResumeAiConversationCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = chat.messages.length === 0;
  const isWorking = composerProps.isBusy || composerProps.sessionGenerating;
  const inProgressUserMessageId = isWorking
    ? chat.messages.filter((message) => message.role === "user").at(-1)?.id
    : undefined;

  function attachDirective(command: string) {
    composerProps.promptAreaRef.current?.insertChip({
      trigger: "/",
      value: command,
      displayText: command.replace(/^\//, ""),
    });
    composerProps.promptAreaRef.current?.focus();
  }

  if (isEmpty && !historyPending) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center-safe gap-8 overflow-y-auto px-4 py-6"
        data-test="resume-ai-conversation"
      >
        <div
          className="flex w-full max-w-3xl flex-col items-center gap-2 text-center"
          data-test="resume-ai-intro"
        >
          <h2 className="text-3xl font-semibold tracking-tight">
            How can I help with your resume?
          </h2>
          <p className="text-sm text-muted-foreground">
            Type a message. Attach a directive below or type <code>/</code> to steer the response.
            Focus a section with <code>#</code>, reference another resume with <code>@</code>.
          </p>
        </div>
        <ResumeAiPromptComposer {...composerProps} isReady={isReady} hasMessages={false} />
        <div
          className="flex w-full max-w-3xl flex-wrap justify-center gap-2"
          data-test="resume-ai-suggestions"
        >
          {DIRECTIVES.map((directive) => (
            <button
              key={directive.command}
              type="button"
              disabled={!isReady}
              onClick={() => attachDirective(directive.command)}
              className="rounded-full border border-border bg-base-200/50 px-4 py-1.5 text-xs text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content disabled:pointer-events-none disabled:opacity-50"
              data-test={`resume-ai-directive-${directive.command.slice(1)}`}
            >
              {directive.command} · {directive.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-test="resume-ai-conversation">
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pr-3 pb-2"
        data-test="resume-ai-messages"
      >
        {isEmpty && historyPending ? (
          <ConversationSkeleton />
        ) : (
          <ResumeAiChatActionsContext
            value={{
              isBusy: composerProps.isBusy,
              isReady,
              inProgressUserMessageId,
              onEdit: onEditPastPrompt,
              onResend: onResendPastPrompt,
            }}
          >
            <ResumeAiChatUI.Provider chat={chat}>
              <ResumeAiVirtualMessages scrollRef={scrollRef} />
            </ResumeAiChatUI.Provider>
          </ResumeAiChatActionsContext>
        )}
        {isWorking ? (
          <div className="shrink-0 px-4 py-2" data-test="resume-ai-working">
            <DotsPulse label="Assistant is working" />
          </div>
        ) : null}
        <div ref={endOfMessagesRef} />
      </div>
      <div className="shrink-0 pt-2 pb-1">
        <ResumeAiPromptComposer {...composerProps} isReady={isReady} hasMessages={!isEmpty} />
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col gap-4 py-8">
      {[80, 60, 95, 50].map((width) => (
        <div key={width} className="flex items-start">
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div
              className="h-3 animate-pulse rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]"
              style={{ width: `${width}%` }}
            />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_7%,transparent)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
