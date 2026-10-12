import { resumeWriteToolNames } from "@/features/agentic-tools/resume-write-tools";
import {
  useResumeWorkbench,
  useResumeWorkbenchActions,
} from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchProvider";
import type { UIMessage } from "@tanstack/ai-react";
import { useEffect } from "react";

/** True while an in-flight reply calls a résumé write tool; history loaded on open doesn't count. */
export function isReplyWritingResume(messages: UIMessage[], isLoading: boolean) {
  const latest = messages.at(-1);
  return (
    isLoading &&
    latest?.role === "assistant" &&
    latest.parts.some((part) => part.type === "tool-call" && resumeWriteToolNames.has(part.name))
  );
}

/**
 * Opens the live preview beside the AI chat the first time a reply writes to a
 * résumé. Once the user closes it, it stays shut until the chat is cleared.
 */
export function useResumeAiPreviewPanel({
  messages,
  isLoading,
}: {
  messages: UIMessage[];
  isLoading: boolean;
}) {
  const open = useResumeWorkbench((state) => state.ai.previewOpen);
  const { autoOpenPreview, allowPreviewAutoOpen } = useResumeWorkbenchActions();
  const isWritingResume = isReplyWritingResume(messages, isLoading);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (isWritingResume) autoOpenPreview();
  }, [isWritingResume, autoOpenPreview]);

  useEffect(() => {
    if (isEmpty) allowPreviewAutoOpen();
  }, [isEmpty, allowPreviewAutoOpen]);

  return open;
}
