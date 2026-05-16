import { Card, CardContent } from "@/components/ui/card";
import { FileSearch, Sparkles } from "lucide-react";
import type { UIMessage } from "@tanstack/ai-react";
import { ResumeAiComposer } from "./ResumeAiComposer";
import { ResumeAiMessage } from "./ResumeAiMessage";
import type { ResumeAiMessageAction } from "./resume-ai-types";
import type { ComponentProps, RefObject } from "react";

interface ResumeAiConversationCardProps extends Omit<
  ComponentProps<typeof ResumeAiComposer>,
  "messagesCount"
> {
  endOfMessagesRef: RefObject<HTMLDivElement | null>;
  historyPending: boolean;
  isReady: boolean;
  messages: UIMessage[];
  onEditPastPrompt: ResumeAiMessageAction;
  onResendPastPrompt: ResumeAiMessageAction;
}

export function ResumeAiConversationCard({
  endOfMessagesRef,
  historyPending,
  isReady,
  messages,
  onEditPastPrompt,
  onResendPastPrompt,
  ...composerProps
}: ResumeAiConversationCardProps) {
  return (
    <Card className="min-h-120 overflow-hidden border-0 bg-[color-mix(in_oklch,var(--color-base-200)_86%,var(--color-base-content)_14%)] shadow-[0_24px_80px_color-mix(in_oklch,var(--color-base-content)_10%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
      <CardContent className="flex h-full flex-col gap-0 p-0">
        <ConversationHeader count={messages.length} />
        <div className="flex min-h-96 flex-col gap-5 overflow-hidden px-4 py-5 sm:px-5">
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
              />
            ))
          )}
          <div ref={endOfMessagesRef} />
        </div>
        <ResumeAiComposer {...composerProps} isReady={isReady} messagesCount={messages.length} />
      </CardContent>
    </Card>
  );
}

function ConversationHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] px-4 py-3 sm:px-5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-primary)_14%,transparent)] text-primary">
        <FileSearch className="size-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">Conversation</p>
        <p className="text-xs text-muted-foreground">
          {count === 0 ? "No messages yet" : `${count} message${count === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col gap-4 rounded-2xl bg-base-100/55 px-6 py-8 ring-1 ring-dashed ring-[color-mix(in_oklch,var(--color-base-content)_14%,transparent)]">
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
    <div className="flex h-full flex-1 flex-col items-center justify-center rounded-2xl bg-base-100/55 px-6 py-12 text-center ring-1 ring-dashed ring-[color-mix(in_oklch,var(--color-base-content)_14%,transparent)]">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--color-primary)_13%,transparent)] text-primary">
        <Sparkles className="size-5" />
      </div>
      <p className="text-sm font-medium">
        {isReady ? "Start a resume tailoring chat" : "Connect an AI provider first"}
      </p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {isReady
          ? "Choose a prompt above or ask for a specific edit, fit check, or rewrite."
          : "Configure your OpenRouter API key above to unlock the assistant."}
      </p>
    </div>
  );
}
