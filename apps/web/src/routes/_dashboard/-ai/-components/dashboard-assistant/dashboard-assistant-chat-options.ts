import type { ChatUIHost } from "@tanstack/ai-react/ui";
import { pageAssistantClientTools } from "@/routes/_dashboard/-ai/-utils/page-assistant-client-tools";

/** Types the chat UI widgets; `useChat` gets the same tools with its connection and context. */
export const dashboardAssistantChatOptions = { tools: pageAssistantClientTools };

export type DashboardAssistantChatOptions = typeof dashboardAssistantChatOptions;
export type DashboardAssistantChat = ChatUIHost<DashboardAssistantChatOptions>;
export type DashboardAssistantToolName = DashboardAssistantChatOptions["tools"][number]["name"];
