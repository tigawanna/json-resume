import { Brain, ChevronDown } from "lucide-react";
import { useState } from "react";

interface ResumeAiThinkingBlockProps {
  content: string;
  /** Read once on mount: opens for thinking that streams in live, stays closed for history. */
  defaultOpen: boolean;
}

export function ResumeAiThinkingBlock({ content, defaultOpen }: ResumeAiThinkingBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group max-w-full overflow-hidden text-xs text-muted-foreground/75"
      data-test="resume-ai-thinking"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1 font-medium text-muted-foreground marker:hidden">
        <Brain className="size-3.5 shrink-0" />
        <span>Thinking</span>
        <ChevronDown className="ml-auto size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-2 pl-5 whitespace-pre-wrap leading-5 text-muted-foreground/70">{content}</p>
    </details>
  );
}
