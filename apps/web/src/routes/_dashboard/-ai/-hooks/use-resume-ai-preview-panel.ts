import { saveApplicationAnswersToolOutputSchema } from "@/features/agentic-tools/application-answer-tool-schemas";
import { saveCoverLetterToolOutputSchema } from "@/features/agentic-tools/cover-letter-tool-schemas";
import { saveApplicationAnswersToolDefinition } from "@/features/agentic-tools/definitions/application-answer-definitions";
import { saveCoverLetterToolDefinition } from "@/features/agentic-tools/definitions/cover-letter-definitions";
import { resumeWriteToolNames } from "@/features/agentic-tools/resume-write-tools";
import {
  useResumeWorkbench,
  useResumeWorkbenchActions,
} from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchProvider";
import type { UIMessage } from "@tanstack/ai-react";
import { useEffect } from "react";

/** True while an in-flight reply calls a résumé write tool; history loaded on open doesn't count. */
export function isReplyWritingResume(messages: readonly UIMessage[], isLoading: boolean) {
  const latest = messages.at(-1);
  return (
    isLoading &&
    latest?.role === "assistant" &&
    latest.parts.some((part) => part.type === "tool-call" && resumeWriteToolNames.has(part.name))
  );
}

/** The cover letter an in-flight reply saved last, or null. */
export function coverLetterSavedByReply(messages: readonly UIMessage[], isLoading: boolean) {
  const latest = messages.at(-1);
  if (!isLoading || latest?.role !== "assistant") return null;
  for (const part of [...latest.parts].reverse()) {
    if (part.type !== "tool-call" || part.name !== saveCoverLetterToolDefinition.name) continue;
    const saved = saveCoverLetterToolOutputSchema.safeParse(part.output);
    if (saved.success) return saved.data.coverLetter.id;
  }
  return null;
}

/** The job of the application answers an in-flight reply saved last, or null when it saved none. */
export function answersSavedByReply(
  messages: readonly UIMessage[],
  isLoading: boolean,
): { jobId: string | null } | null {
  const latest = messages.at(-1);
  if (!isLoading || latest?.role !== "assistant") return null;
  for (const part of [...latest.parts].reverse()) {
    if (part.type !== "tool-call" || part.name !== saveApplicationAnswersToolDefinition.name) {
      continue;
    }
    const saved = saveApplicationAnswersToolOutputSchema.safeParse(part.output);
    if (saved.success) return { jobId: saved.data.answers[0]?.jobId ?? null };
  }
  return null;
}

/**
 * Opens the live preview beside the AI chat the first time a reply writes to a
 * résumé or saves a cover letter or application answers. Once the user closes it, it stays shut until
 * the chat is cleared.
 */
export function useResumeAiPreviewPanel({
  messages,
  isLoading,
}: {
  messages: readonly UIMessage[];
  isLoading: boolean;
}) {
  const open = useResumeWorkbench((state) => state.ai.previewOpen);
  const { autoOpenPreview, allowPreviewAutoOpen, focusCoverLetter, focusAnswers } =
    useResumeWorkbenchActions();
  const isWritingResume = isReplyWritingResume(messages, isLoading);
  const savedCoverLetterId = coverLetterSavedByReply(messages, isLoading);
  const savedAnswers = answersSavedByReply(messages, isLoading);
  const hasSavedAnswers = savedAnswers !== null;
  const savedAnswersJobId = savedAnswers?.jobId ?? null;
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (isWritingResume) autoOpenPreview();
  }, [isWritingResume, autoOpenPreview]);

  useEffect(() => {
    if (savedCoverLetterId) focusCoverLetter(savedCoverLetterId, "unless-dismissed");
  }, [savedCoverLetterId, focusCoverLetter]);

  useEffect(() => {
    if (hasSavedAnswers) focusAnswers(savedAnswersJobId, "unless-dismissed");
  }, [hasSavedAnswers, savedAnswersJobId, focusAnswers]);

  useEffect(() => {
    if (isEmpty) allowPreviewAutoOpen();
  }, [isEmpty, allowPreviewAutoOpen]);

  return open;
}
