import { Injectable } from "@nestjs/common";
import { chatToolDefinitions } from "@repo/isomorphic/agentic/definitions/chat-tool-definitions";
import {
  buildEventSourcedSystemPrompt,
  type ActiveJobContext,
} from "@repo/isomorphic/agentic/prompts/system-prompt";
import type { StreamChunk } from "@tanstack/ai";
import {
  AgentChatService,
  type AgentModelSettings,
  type ChatRunParams,
} from "./agent-chat.service.js";

const MAX_AGENT_ITERATIONS = 16;

@Injectable()
export class ResumeChatService {
  constructor(private readonly chat: AgentChatService) {}

  streamEventSourcedResumeAgentChat(
    input: ChatRunParams &
      AgentModelSettings & {
        resumeId: string;
        activeResumeId?: string | null;
        activeJob?: ActiveJobContext;
        systemPrompt?: string;
        slopGuard?: boolean;
        skillInstructions?: string;
        frontendOrigin: string;
        abortController: AbortController;
      },
  ): AsyncIterable<StreamChunk> {
    return this.chat.streamAgentChat({
      ...input,
      agent: "resume",
      systemPrompt: buildEventSourcedSystemPrompt({
        instructions: input.systemPrompt ?? "",
        resumeId: input.resumeId,
        activeResumeId: input.activeResumeId,
        activeJob: input.activeJob,
        slopGuard: input.slopGuard,
        skillInstructions: input.skillInstructions,
      }),
      tools: chatToolDefinitions,
      maxIterations: MAX_AGENT_ITERATIONS,
    });
  }
}
