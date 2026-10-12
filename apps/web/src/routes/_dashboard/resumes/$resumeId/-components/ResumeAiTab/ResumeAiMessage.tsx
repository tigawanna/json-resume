import { DotsPulse } from "@/components/loaders/DotsPulse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LayoutProps, MessageProps } from "@tanstack/ai-react/ui";
import type { ReactNode } from "react";
import { PencilLine, RefreshCcw } from "lucide-react";
import { useResumeAiChatActions } from "./resume-ai-chat-actions";
import type { ResumeAiChatOptions } from "./resume-ai-chat-options";

export function ResumeAiChatLayout({ Messages }: LayoutProps<ResumeAiChatOptions, undefined>) {
  const { isWorking } = useResumeAiChatActions();
  return (
    <>
      <Messages />
      {isWorking ? (
        <div className="px-4 py-2" data-test="resume-ai-working">
          <DotsPulse label="Assistant is working" />
        </div>
      ) : null}
    </>
  );
}

export function ResumeAiMessage({ message, Parts }: MessageProps<ResumeAiChatOptions>) {
  const { isBusy, isReady, inProgressUserMessageId, onEdit, onResend } = useResumeAiChatActions();
  const isUser = message.role === "user";
  const isInProgress = isUser && message.id === inProgressUserMessageId;
  const bubbleShape = isUser ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tl-md";

  return (
    <div
      className={cn("flex w-full flex-col gap-1", isUser ? "items-end" : "items-start")}
      data-test={`resume-ai-message-${isUser ? "user" : "assistant"}`}
    >
      <div
        className={cn("relative isolate min-w-0 max-w-[min(44rem,calc(100%-3rem))]", bubbleShape)}
      >
        <div
          className={cn(
            "min-w-0 overflow-hidden px-4 py-3 shadow-sm ring-1",
            bubbleShape,
            isUser
              ? "bg-primary/10 ring-[color-mix(in_oklch,var(--color-primary)_34%,transparent)]"
              : "bg-base-100 text-foreground ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)]",
          )}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <Parts />
          </div>
        </div>
        {isInProgress ? (
          <>
            <span aria-hidden className="ai-glow-halo">
              <span className="ai-glow-ring" />
            </span>
            <span aria-hidden className="ai-glow-ring" data-test="resume-ai-in-progress-glow" />
          </>
        ) : null}
      </div>
      {isUser ? (
        <div className="flex items-center gap-1">
          <PromptActionButton
            label="Edit prompt"
            disabled={!isReady}
            onClick={() => onEdit(message)}
            dataTest="resume-ai-edit-past-prompt"
          >
            <PencilLine className="size-3.5" />
          </PromptActionButton>
          <PromptActionButton
            label="Resend prompt"
            disabled={!isReady || isBusy}
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
