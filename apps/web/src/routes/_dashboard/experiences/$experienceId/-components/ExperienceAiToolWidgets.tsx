import { ChatText } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiMarkdown";
import { ResumeAiThinkingBlock } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiThinkingBlock";
import {
  ToolCallPanel,
  ToolResultPanel,
} from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiToolPanels";
import type { PartProps, ToolProps } from "@tanstack/ai-react/ui";
import type { ExperienceAiChatOptions, ExperienceAiToolName } from "./experience-ai-chat-options";

export function ExperienceTextPart({ part }: PartProps<ExperienceAiChatOptions, "text">) {
  return part.content.trim() ? <ChatText content={part.content} /> : null;
}

export function ExperienceThinkingPart({ part }: PartProps<ExperienceAiChatOptions, "thinking">) {
  return part.content.trim() ? (
    <ResumeAiThinkingBlock content={part.content} defaultOpen={false} />
  ) : null;
}

/** A result whose call is in another message; results next to their call render inside the call. */
export function ExperienceToolResultPart({
  part,
}: PartProps<ExperienceAiChatOptions, "toolResult">) {
  return (
    <ToolResultPanel
      part={{
        toolCallId: part.toolCallId,
        content: typeof part.content === "string" ? part.content : JSON.stringify(part.content),
        state: part.state,
        error: part.error,
      }}
    />
  );
}

/** Generic so one component fills every tool's slot, each typed for its own name. */
export function ExperienceToolCall<TName extends ExperienceAiToolName>({
  part,
  result,
}: ToolProps<ExperienceAiChatOptions, TName>) {
  return (
    <ToolCallPanel
      part={{
        id: part.id,
        name: part.name,
        arguments: part.arguments,
        state: part.state,
        output: part.output,
        ...(result?.error ? { error: result.error } : {}),
      }}
    />
  );
}
