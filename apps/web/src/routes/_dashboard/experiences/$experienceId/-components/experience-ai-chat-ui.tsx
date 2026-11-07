import { cn } from "@/lib/utils";
import { createChatUI, type MessageProps } from "@tanstack/ai-react/ui";
import {
  ExperienceTextPart,
  ExperienceThinkingPart,
  ExperienceToolCall,
  ExperienceToolResultPart,
} from "./ExperienceAiToolWidgets";
import {
  experienceAiChatOptions,
  type ExperienceAiChatOptions,
} from "./experience-ai-chat-options";

export function ExperienceAiMessage({ message, Parts }: MessageProps<ExperienceAiChatOptions>) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      data-test={`experience-ai-message-${isUser ? "user" : "assistant"}`}
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

/** Every tool needs an entry; each runs against the local database in this group only. */
export const ExperienceAiChatUI = createChatUI(experienceAiChatOptions, {
  components: {
    layout: ({ Messages, Queue }) => (
      <>
        <Messages />
        <Queue />
      </>
    ),
    message: ExperienceAiMessage,
  },
  partsComponents: {
    text: ExperienceTextPart,
    thinking: ExperienceThinkingPart,
    toolResult: ExperienceToolResultPart,
    fallback: () => null,
  },
  toolsComponents: {
    list_experience_titles: ExperienceToolCall,
    list_experience_bullets: ExperienceToolCall,
    update_experience_bullet: ExperienceToolCall,
    move_experience_bullet: ExperienceToolCall,
    delete_experience_bullet: ExperienceToolCall,
    set_experience_title_bullets: ExperienceToolCall,
  },
});
