import type { UIMessage } from "@tanstack/ai-react";

export interface ResumeAiTabProps {
  resumeId: string;
  jobDescription: string;
}

export interface ToolCallViewPart {
  id: string;
  name: string;
  arguments: string;
  state: string;
  output?: unknown;
}

export interface ToolResultViewPart {
  toolCallId: string;
  content: string;
  state: string;
  error?: string;
}

export interface CreatedResumeOutput {
  resumeId: string;
  name?: string;
}

export type ResumeAiRole = "assistant" | "user";

export type ResumeAiPromptAction = (message: string) => void | Promise<void>;
export type ResumeAiMessageAction = (message: UIMessage) => void | Promise<void>;

export const isLocalMode = import.meta.env.VITE_AI_LOCAL_MODE === "true";

export const writeToolNames = new Set([
  "clone_current_resume",
  "create_resume_from_document",
  "update_current_resume_document",
]);

export const createdResumeToolNames = new Set([
  "clone_current_resume",
  "create_resume_from_document",
]);
