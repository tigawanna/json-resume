import { createChatUI, type MessageProps } from "@tanstack/ai-react/ui";
import { cn } from "@/lib/utils";
import {
  dashboardAssistantChatOptions,
  type DashboardAssistantChatOptions,
} from "./dashboard-assistant-chat-options";
import {
  DashboardStartResumeTool,
  DashboardTextPart,
  DashboardThinkingPart,
  DashboardToolCall,
  DashboardToolResultPart,
} from "./DashboardAssistantToolWidgets";

function DashboardAssistantMessage({
  message,
  Parts,
}: MessageProps<DashboardAssistantChatOptions>) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      data-test={`dashboard-assistant-message-${isUser ? "user" : "assistant"}`}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2 text-sm",
          isUser
            ? "max-w-[85%] rounded-2xl rounded-tr-md bg-primary/10 px-3.5 py-2.5 ring-1 ring-[color-mix(in_oklch,var(--color-primary)_30%,transparent)]"
            : "w-full",
        )}
      >
        <Parts />
      </div>
    </div>
  );
}

/** Every tool needs an entry. `start_resume_for_job` gets its approval as the `interrupt` prop. */
export const DashboardAssistantChatUI = createChatUI(dashboardAssistantChatOptions, {
  components: {
    layout: ({ Messages }) => <Messages />,
    message: DashboardAssistantMessage,
  },
  partsComponents: {
    text: DashboardTextPart,
    thinking: DashboardThinkingPart,
    toolResult: DashboardToolResultPart,
    fallback: () => null,
  },
  toolsComponents: {
    list_resumes: DashboardToolCall,
    get_resume: DashboardToolCall,
    rank_resumes_for_job: DashboardToolCall,
    save_job: DashboardToolCall,
    list_jobs: DashboardToolCall,
    get_job: DashboardToolCall,
    search_library: DashboardToolCall,
    search_application_answers: DashboardToolCall,
    list_cover_letters: DashboardToolCall,
    get_cover_letter: DashboardToolCall,
    get_application_stats: DashboardToolCall,
    get_profile_overview: DashboardToolCall,
    start_resume_for_job: DashboardStartResumeTool,
  },
});
