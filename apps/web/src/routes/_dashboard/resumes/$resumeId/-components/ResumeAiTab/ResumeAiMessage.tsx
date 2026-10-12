import { CreatedResumeCard } from "@/components/agentic-tools/CreatedResumeCard";
import { getCreatedResumeOutput } from "@/features/agentic-tools/created-resume-output";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@tanstack/ai-react";
import type { ReactNode } from "react";
import { PencilLine, RefreshCcw } from "lucide-react";
import { ChatText } from "./ResumeAiMarkdown";
import { ResumeAiThinkingBlock } from "./ResumeAiThinkingBlock";
import { ToolCallPanel, ToolResultPanel } from "./ResumeAiToolPanels";
import type { ResumeAiMessageAction, ResumeAiRole } from "./resume-ai-types";

interface ResumeAiMessageProps {
  message: UIMessage;
  isBusy: boolean;
  isReady: boolean;
  /** This message is the one currently being streamed in. */
  isStreaming: boolean;
  onEdit: ResumeAiMessageAction;
  onResend: ResumeAiMessageAction;
  createdResumeTo?: "/resumes/$resumeId";
}

export function ResumeAiMessage({
  message,
  isBusy,
  isReady,
  isStreaming,
  onEdit,
  onResend,
  createdResumeTo,
}: ResumeAiMessageProps) {
  const role: ResumeAiRole = message.role === "assistant" ? "assistant" : "user";
  const resultsByCallId = new Map<string, ToolResultPart>();
  for (const part of message.parts) {
    if (part.type === "tool-result") resultsByCallId.set(part.toolCallId, part);
  }
  const callIds = new Set(
    message.parts.flatMap((part) => (part.type === "tool-call" ? [part.id] : [])),
  );

  return (
    <div
      className={cn("flex w-full flex-col gap-1", role === "user" ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "min-w-0 max-w-[min(44rem,calc(100%-3rem))] overflow-hidden rounded-2xl px-4 py-3 shadow-sm ring-1 ",
          role === "user"
            ? "rounded-tr-md bg-primary/10 ring-[color-mix(in_oklch,var(--color-primary)_34%,transparent)]"
            : "rounded-tl-md bg-base-100 text-foreground ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)]",
        )}
      >
        <div className="flex min-w-0 flex-col gap-2">
          {message.parts.map((part, index) => (
            <MessagePartView
              key={part.type === "tool-call" ? part.id : index}
              part={part}
              role={role}
              isStreaming={isStreaming}
              result={part.type === "tool-call" ? resultsByCallId.get(part.id) : undefined}
              hasCall={part.type === "tool-result" && callIds.has(part.toolCallId)}
              createdResumeTo={createdResumeTo}
            />
          ))}
        </div>
      </div>
      {role === "user" ? (
        <div className="flex items-center gap-1">
          <PromptActionButton
            label="Edit prompt"
            disabled={isBusy || !isReady}
            onClick={() => onEdit(message)}
            dataTest="resume-ai-edit-past-prompt"
          >
            <PencilLine className="size-3.5" />
          </PromptActionButton>
          <PromptActionButton
            label="Resend prompt"
            disabled={isBusy || !isReady}
            onClick={() => onResend(message)}
            dataTest="resume-ai-resend-past-prompt"
          >
            <RefreshCcw className="size-3.5" />
          </PromptActionButton>
        </div>
      ) : null}
    </div>
  );
}

type MessagePart = UIMessage["parts"][number];
type ToolResultPart = Extract<MessagePart, { type: "tool-result" }>;

interface MessagePartViewProps {
  part: MessagePart;
  role: ResumeAiRole;
  isStreaming: boolean;
  /** The tool-result for a tool-call part, merged into the call's row. */
  result: ToolResultPart | undefined;
  /** For a tool-result part: its call is in the same message and already shows it. */
  hasCall: boolean;
  createdResumeTo?: "/resumes/$resumeId";
}

function MessagePartView({
  part,
  role,
  isStreaming,
  result,
  hasCall,
  createdResumeTo,
}: MessagePartViewProps) {
  switch (part.type) {
    case "text":
      return part.content.trim() ? <ChatText content={part.content} role={role} /> : null;
    case "thinking":
      return part.content.trim() ? (
        <ResumeAiThinkingBlock content={part.content} defaultOpen={isStreaming} />
      ) : null;
    case "tool-call": {
      const createdResume = getCreatedResumeOutput(part);
      return (
        <>
          <ToolCallPanel
            part={{
              id: part.id,
              name: part.name,
              arguments: part.arguments,
              state: part.state,
              output: part.output,
              ...(result?.error ? { error: result.error } : {}),
            }}
          />
          {createdResume ? (
            <CreatedResumeCard
              output={createdResume}
              to={createdResumeTo}
              dataTest="resume-ai-created-resume-card"
            />
          ) : null}
        </>
      );
    }
    case "tool-result":
      if (hasCall) return null;
      return (
        <ToolResultPanel
          part={{
            toolCallId: part.toolCallId,
            content: typeof part.content === "string" ? part.content : JSON.stringify(part.content),
            state: part.state,
            error: part.error,
          }}
        />
      );
    default:
      return null;
  }
}

interface PromptActionButtonProps {
  children: ReactNode;
  dataTest: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
}

function PromptActionButton({
  children,
  dataTest,
  disabled,
  label,
  onClick,
}: PromptActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      className="size-7 rounded-lg hover:bg-primary/30 hover:text-primary"
      data-test={dataTest}
      title={label}
    >
      {children}
    </Button>
  );
}
