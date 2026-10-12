import { eventSourcedResumeAiClientTools } from "@/routes/_dashboard/-ai/-utils/client-tools";
import type { ChatUIHost } from "@tanstack/ai-react/ui";

/** Types the chat UI widgets; `useChat` gets the same tools with its connection and context. */
export const resumeAiChatOptions = { tools: eventSourcedResumeAiClientTools };

export type ResumeAiChatOptions = typeof resumeAiChatOptions;
export type ResumeAiChat = ChatUIHost<ResumeAiChatOptions>;
export type ResumeAiToolName = ResumeAiChatOptions["tools"][number]["name"];
