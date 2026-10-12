import { dashboardAssistantClientTools } from "@/routes/_dashboard/-ai/-utils/dashboard-client-tools";
import type { ChatUIHost } from "@tanstack/ai-react/ui";

/** Types the chat UI widgets; `useChat` gets the same tools with its connection and context. */
export const dashboardAssistantChatOptions = { tools: dashboardAssistantClientTools };

export type DashboardAssistantChatOptions = typeof dashboardAssistantChatOptions;
export type DashboardAssistantChat = ChatUIHost<DashboardAssistantChatOptions>;
export type DashboardAssistantToolName = DashboardAssistantChatOptions["tools"][number]["name"];
