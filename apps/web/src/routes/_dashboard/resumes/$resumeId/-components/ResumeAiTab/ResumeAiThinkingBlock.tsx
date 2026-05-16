import type { UIMessage } from "@tanstack/ai-react";
import { Brain, ChevronDown } from "lucide-react";
import { ToolCallPanel, ToolResultPanel } from "./ResumeAiToolPanels";

type MessagePart = UIMessage["parts"][number];

interface ResumeAiThinkingBlockProps {
  parts: MessagePart[];
}

export function ResumeAiThinkingBlock({ parts }: ResumeAiThinkingBlockProps) {
  const hasToolActivity = parts.some(
    (part) => part.type === "tool-call" || part.type === "tool-result",
  );
  const thinkingParts = parts.filter((part) => part.type === "thinking");

  return (
    <details
      open={hasToolActivity}
      className="group max-w-full overflow-hidden text-xs text-muted-foreground/75"
      data-test="resume-ai-thinking"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1 font-medium text-muted-foreground marker:hidden">
        <Brain className="size-3.5 shrink-0" />
        <span>{hasToolActivity ? "Thinking and tool activity" : "Thinking"}</span>
        <ChevronDown className="ml-auto size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 flex min-w-0 flex-col gap-2 pl-5">
        {thinkingParts.map((part, index) => (
          <p key={index} className="whitespace-pre-wrap leading-5 text-muted-foreground/70">
            {part.content}
          </p>
        ))}
        {parts.map((part, index) => {
          if (part.type === "tool-call") return <ToolCallPanel key={index} part={part} />;
          if (part.type === "tool-result") return <ToolResultPanel key={index} part={part} />;
          return null;
        })}
      </div>
    </details>
  );
}
