import type { UIMessage } from "@tanstack/ai-react";
import { ResumeAiComposer } from "./ResumeAiComposer";
import { ResumeAiMessage } from "./ResumeAiMessage";
import type { ResumeAiMessageAction } from "./resume-ai-types";
import { useState, type ComponentProps, type RefObject } from "react";

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
  const [attachedDirectives, setAttachedDirectives] = useState<string[]>([]);
  const isEmpty = messages.length === 0;

  function toggleDirective(command: string) {
    setAttachedDirectives((current) =>
      current.includes(command) ? current.filter((c) => c !== command) : [...current, command],
    );
  }

  function sendWithDirectives(message: string) {
    const directives = DIRECTIVES.filter((directive) =>
      attachedDirectives.includes(directive.command),
    );
    if (directives.length === 0) return composerProps.onSend(message);
    const directiveBlock = directives
      .map((directive) => `${directive.command}: ${directive.instruction}`)
      .join("\n");
    const result = composerProps.onSend(`${message}\n\n${directiveBlock}`);
    setAttachedDirectives([]);
    return result;
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
            Type a message, or attach a directive below to steer the response.
          </p>
        </div>
        <div className="w-full max-w-3xl">
          <ResumeAiComposer
            {...composerProps}
            isReady={isReady}
            onSend={sendWithDirectives}
            attachedDirectives={attachedDirectives}
            onRemoveDirective={(command) =>
              setAttachedDirectives((current) => current.filter((c) => c !== command))
            }
          />
        </div>
        <div
          className="flex w-full max-w-3xl flex-wrap justify-center gap-2"
          data-test="resume-ai-suggestions"
        >
          {DIRECTIVES.map((directive) => {
            const isAttached = attachedDirectives.includes(directive.command);
            return (
              <button
                key={directive.command}
                type="button"
                disabled={!isReady || composerProps.isBusy}
                aria-pressed={isAttached}
                onClick={() => toggleDirective(directive.command)}
                className={`rounded-full border px-4 py-1.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                  isAttached
                    ? "border-primary bg-primary/15 font-medium text-primary"
                    : "border-border bg-base-200/50 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                }`}
                data-test={`resume-ai-directive-${directive.command.slice(1)}`}
              >
                {directive.command} · {directive.label}
              </button>
            );
          })}
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
      <ResumeAiComposer {...composerProps} isReady={isReady} />
    </div>
  );
}

const DIRECTIVES = [
  {
    command: "/fit-analysis",
    label: "Fit analysis",
    instruction:
      "Analyze how well my resume fits the job description I provide. Call out strong matches, gaps, and missing keywords.",
  },
  {
    command: "/rewrite-summary",
    label: "Rewrite summary",
    instruction:
      "Rewrite my professional summary to be more impactful, concrete, and results-oriented.",
  },
  {
    command: "/improve-bullets",
    label: "Improve bullets",
    instruction:
      "Improve the bullet points in my most recent role with stronger action verbs and quantified achievements.",
  },
  {
    command: "/tailor",
    label: "Tailor resume",
    instruction:
      "Tailor this resume for the specific role I describe, aligning wording and emphasis with the job description.",
  },
];

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
