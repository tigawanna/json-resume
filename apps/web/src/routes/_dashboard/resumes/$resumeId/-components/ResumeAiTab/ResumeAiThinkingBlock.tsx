import { Button } from "@/components/ui/button";
import { Brain, ChevronDown, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

async function copyThinking(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    toast.success("Copied");
  } catch (err: unknown) {
    toast.error("Could not copy", {
      description: err instanceof Error ? err.message : "Clipboard is unavailable",
    });
  }
}

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
        <span className="min-w-0 flex-1">Thinking</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            void copyThinking(content);
          }}
          className="size-6 shrink-0 rounded-md text-muted-foreground hover:bg-primary/30 hover:text-primary"
          data-test="resume-ai-thinking-copy"
          title="Copy thinking"
          aria-label="Copy thinking"
        >
          <Copy className="size-3.5" />
        </Button>
        <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-2 pl-5 whitespace-pre-wrap leading-5 text-muted-foreground/70">{content}</p>
    </details>
  );
}
