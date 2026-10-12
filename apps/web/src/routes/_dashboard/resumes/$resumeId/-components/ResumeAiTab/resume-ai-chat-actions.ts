import { createContext, use } from "react";
import type { ResumeAiMessageAction } from "./resume-ai-types";

export interface ResumeAiChatActions {
  isBusy: boolean;
  isReady: boolean;
  /** The user message whose response is still being worked on. */
  inProgressUserMessageId: string | undefined;
  onEdit: ResumeAiMessageAction;
  onResend: ResumeAiMessageAction;
}

/** App state the chat UI widgets need beyond the chat instance itself. */
export const ResumeAiChatActionsContext = createContext<ResumeAiChatActions | null>(null);

export function useResumeAiChatActions(): ResumeAiChatActions {
  const actions = use(ResumeAiChatActionsContext);
  if (!actions) throw new Error("Resume AI widgets must render inside ResumeAiChatActionsContext.");
  return actions;
}
