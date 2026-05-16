import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@tanstack/ai-react";
import type { ReactNode } from "react";
import { MessageSquareText, PencilLine, RefreshCcw, Sparkles } from "lucide-react";
import { ChatText } from "./ResumeAiMarkdown";
import { ToolCallPanel, ToolResultPanel } from "./ResumeAiToolPanels";
import type { ResumeAiMessageAction, ResumeAiRole } from "./resume-ai-types";

interface ResumeAiMessageProps {
  message: UIMessage;
  isBusy: boolean;
  isReady: boolean;
  onEdit: ResumeAiMessageAction;
  onResend: ResumeAiMessageAction;
}

function ChatAvatar({ role }: { role: ResumeAiRole }) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
        isAssistant
          ? "bg-[color-mix(in_oklch,var(--color-primary)_18%,var(--color-base-200))] text-primary ring-[color-mix(in_oklch,var(--color-primary)_32%,transparent)]"
          : "bg-primary text-primary-foreground ring-[color-mix(in_oklch,var(--color-primary)_42%,transparent)]",
      )}
      aria-hidden="true"
    >
      {isAssistant ? <Sparkles className="size-4" /> : <MessageSquareText className="size-4" />}
    </div>
  );
}

export function ResumeAiMessage({
  message,
  isBusy,
  isReady,
  onEdit,
  onResend,
}: ResumeAiMessageProps) {
  const role: ResumeAiRole = message.role === "assistant" ? "assistant" : "user";

  return (
    <div className={cn("flex w-full items-start gap-3", role === "user" && "flex-row-reverse")}>
      <ChatAvatar role={role} />
      <div
        className={cn(
          "min-w-0 max-w-[min(44rem,calc(100%-3rem))] rounded-2xl px-4 py-3 shadow-sm ring-1",
          role === "user"
            ? "rounded-tr-md bg-primary text-primary-foreground ring-[color-mix(in_oklch,var(--color-primary)_34%,transparent)]"
            : "rounded-tl-md bg-base-100 text-foreground ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)]",
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p
            className={cn(
              "text-[0.68rem] font-semibold uppercase tracking-normal",
              role === "user" ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {role === "assistant" ? "Assistant" : "You"}
          </p>
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
        <div className="flex flex-col gap-2">
          {message.parts.map((part, index) => {
            if (part.type === "text")
              return <ChatText key={index} content={part.content} role={role} />;
            if (part.type === "tool-call") return <ToolCallPanel key={index} part={part} />;
            if (part.type === "tool-result") return <ToolResultPanel key={index} part={part} />;
            if (part.type !== "thinking") return null;

            return (
              <details
                key={index}
                className="group rounded-lg bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)] px-3 py-2 text-xs text-muted-foreground"
              >
                <summary className="cursor-pointer list-none font-medium text-foreground/80 marker:hidden">
                  Thinking
                </summary>
                <p className="mt-2 whitespace-pre-wrap leading-5">{part.content}</p>
              </details>
            );
          })}
        </div>
      </div>
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
      className="size-7 rounded-lg text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
      data-test={dataTest}
      title={label}
    >
      {children}
    </Button>
  );
}
