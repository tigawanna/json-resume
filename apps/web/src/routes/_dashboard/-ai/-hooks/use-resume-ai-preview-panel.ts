import { resumeWriteToolNames } from "@/features/agentic-tools/resume-write-tools";
import type { UIMessage } from "@tanstack/ai-react";
import { useState } from "react";

/**
 * Open state for the live preview beside the AI chat. It opens itself the first
 * time a reply writes to a résumé, and stays shut once the user closes it until
 * the chat is cleared.
 */
export function useResumeAiPreviewPanel({
  messages,
  isLoading,
}: {
  messages: UIMessage[];
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const latest = messages.at(-1);
  const isWritingResume =
    isLoading &&
    latest?.role === "assistant" &&
    latest.parts.some((part) => part.type === "tool-call" && resumeWriteToolNames.has(part.name));

  if (isWritingResume && !open && !dismissed) setOpen(true);
  if (messages.length === 0 && dismissed) setDismissed(false);

  return {
    open,
    show() {
      setOpen(true);
    },
    close() {
      setOpen(false);
      setDismissed(true);
    },
    toggle() {
      if (open) {
        setOpen(false);
        setDismissed(true);
      } else {
        setOpen(true);
      }
    },
  };
}
