import type { UIMessage } from "@tanstack/ai-react";
import { ResumeAiMessage } from "./ResumeAiMessage";
import { ResumeAiPromptComposer } from "./ResumeAiPromptComposer";
import type { ResumeAiMessageAction } from "./resume-ai-types";
import { DIRECTIVES } from "./resume-ai-directives";
import type { ComponentProps, RefObject } from "react";

interface ResumeAiConversationCardProps extends ComponentProps<typeof ResumeAiPromptComposer> {
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
  const isEmpty = messages.length === 0;

  function attachDirective(command: string) {
    composerProps.promptAreaRef.current?.insertChip({
      trigger: "/",
      value: command,
      displayText: command,
    });
    composerProps.promptAreaRef.current?.focus();
  }

  if (isEmpty && !historyPending) {
    return (
      <div
        className="flex min-h-[calc(100dvh-16rem)] flex-col items-center justify-center gap-8"
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
            Type a message — attach a directive below or type <code>/</code> to steer the response.
            Reference another resume with <code>@</code>.
          </p>
        </div>
        <ResumeAiPromptComposer {...composerProps} isReady={isReady} />
        <div
          className="flex w-full max-w-3xl flex-wrap justify-center gap-2"
          data-test="resume-ai-suggestions"
        >
          {DIRECTIVES.map((directive) => (
            <button
              key={directive.command}
              type="button"
              disabled={!isReady || composerProps.isBusy}
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
    <div
      className="flex min-h-120 flex-col overflow-hidden rounded-xl"
      data-test="resume-ai-conversation"
    >
      <div className="flex min-h-96 flex-col gap-5 px-1 py-2">
        {isEmpty && historyPending ? (
          <ConversationSkeleton />
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
      <ResumeAiPromptComposer {...composerProps} isReady={isReady} />
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
