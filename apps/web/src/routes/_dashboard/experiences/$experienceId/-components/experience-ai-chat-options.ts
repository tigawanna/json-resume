import { experienceAiClientTools } from "../../-utils/experience-ai-tools";
import type { ChatUIHost } from "@tanstack/ai-react/ui";

/** Types the chat UI widgets; `useChat` gets the same tools with its connection and context. */
export const experienceAiChatOptions = { tools: experienceAiClientTools };

export type ExperienceAiChatOptions = typeof experienceAiChatOptions;
export type ExperienceAiChat = ChatUIHost<ExperienceAiChatOptions>;
export type ExperienceAiToolName = ExperienceAiChatOptions["tools"][number]["name"];
