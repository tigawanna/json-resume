import { saveCoverLetterToolOutputSchema } from "@/features/agentic-tools/cover-letter-tool-schemas";
import { saveCoverLetterToolDefinition } from "@/features/agentic-tools/definitions/cover-letter-definitions";
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

/** The cover letter an in-flight reply saved last, or null. */
export function coverLetterSavedByReply(messages: UIMessage[], isLoading: boolean) {
  const latest = messages.at(-1);
  if (!isLoading || latest?.role !== "assistant") return null;
  for (const part of [...latest.parts].reverse()) {
    if (part.type !== "tool-call" || part.name !== saveCoverLetterToolDefinition.name) continue;
    const saved = saveCoverLetterToolOutputSchema.safeParse(part.output);
    if (saved.success) return saved.data.coverLetter.id;
  }
  return null;
}

/**
 * Opens the live preview beside the AI chat the first time a reply writes to a
 * résumé or saves a cover letter. Once the user closes it, it stays shut until
 * the chat is cleared.
 */
export function useResumeAiPreviewPanel({
  messages,
  isLoading,
}: {
  messages: UIMessage[];
  isLoading: boolean;
}) {
  const open = useResumeWorkbench((state) => state.ai.previewOpen);
  const { autoOpenPreview, allowPreviewAutoOpen, focusCoverLetter } = useResumeWorkbenchActions();
  const isWritingResume = isReplyWritingResume(messages, isLoading);
  const savedCoverLetterId = coverLetterSavedByReply(messages, isLoading);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (isWritingResume) autoOpenPreview();
  }, [isWritingResume, autoOpenPreview]);

  useEffect(() => {
    if (savedCoverLetterId) focusCoverLetter(savedCoverLetterId, "unless-dismissed");
  }, [savedCoverLetterId, focusCoverLetter]);

  useEffect(() => {
    if (isEmpty) allowPreviewAutoOpen();
  }, [isEmpty, allowPreviewAutoOpen]);

  return open;
}
