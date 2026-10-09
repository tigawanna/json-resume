import { FileSearch, Sparkles } from "lucide-react";
import type { UIMessage } from "@tanstack/ai-react";
import { ResumeAiComposer } from "./ResumeAiComposer";
import { ResumeAiMessage } from "./ResumeAiMessage";
import type { ResumeAiMessageAction } from "./resume-ai-types";
import type { ComponentProps, RefObject } from "react";

interface ResumeAiConversationCardProps extends ComponentProps<typeof ResumeAiComposer> {
  endOfMessagesRef: RefObject<HTMLDivElement | null>;
  historyPending: boolean;
  isReady: boolean;
  messages: UIMessage[];
  onEditPastPrompt: ResumeAiMessageAction;
  onResendPastPrompt: ResumeAiMessageAction;
  createdResumeTo?: "/resumes/$resumeId";
}

export function ResumeAiConversationCard({
  endOfMessagesRef,
  historyPending,
  isReady,
  messages,
  onEditPastPrompt,
  onResendPastPrompt,
  createdResumeTo,
  ...composerProps
}: ResumeAiConversationCardProps) {
  return (
    <div
      className="flex min-h-120 flex-col overflow-hidden rounded-xl"
      data-test="resume-ai-conversation"
    >
      <div className="flex min-h-96 flex-col gap-5 px-1 py-2">
        {messages.length === 0 && historyPending ? (
          <ConversationSkeleton />
        ) : messages.length === 0 ? (
          <EmptyConversation isReady={isReady} />
        ) : (
          messages.map((message) => (
            <ResumeAiMessage
              key={message.id}
              message={message}
              isBusy={composerProps.isBusy}
              isReady={isReady}
              onEdit={onEditPastPrompt}
              onResend={onResendPastPrompt}
              createdResumeTo={createdResumeTo}
            />
          ))
        )}
        <div ref={endOfMessagesRef} />
      </div>
      <ResumeAiComposer {...composerProps} isReady={isReady} />
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col gap-4 py-8">
      {[80, 60, 95, 50].map((width) => (
        <div key={width} className="flex items-start gap-3">
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]" />
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

function EmptyConversation({ isReady }: { isReady: boolean }) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--color-primary)_13%,transparent)] text-primary">
        {isReady ? <Sparkles className="size-5" /> : <FileSearch className="size-5" />}
      </div>
      <p className="text-sm font-medium">
        {isReady ? "Start a resume tailoring chat" : "Connect an AI provider first"}
      </p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {isReady
          ? "Ask for a specific edit, fit check, or rewrite."
          : "Configure your OpenRouter API key in settings to unlock the assistant."}
      </p>
    </div>
  );
}
