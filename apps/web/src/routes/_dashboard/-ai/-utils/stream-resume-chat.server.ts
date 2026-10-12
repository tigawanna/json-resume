import "@tanstack/react-start/server-only";

import type { StreamChunk } from "@tanstack/ai";
import { chatToolDefinitions } from "@/features/agentic-tools/definitions/chat-tool-definitions";
import {
  streamAgentChat,
  type AgentModelSettings,
  type ChatRunParams,
} from "./stream-agent-chat.server";
import { buildEventSourcedSystemPrompt, type ActiveJobContext } from "./system-prompt";

/** Enough model turns for the job description to tailored résumé chain (about 6 to 9 tool calls). */
const MAX_AGENT_ITERATIONS = 16;

export async function streamEventSourcedResumeAgentChat(
  input: ChatRunParams &
    AgentModelSettings & {
      resumeId: string;
      activeResumeId?: string | null;
      activeJob?: ActiveJobContext;
      systemPrompt?: string;
      slopGuard?: boolean;
    },
): Promise<AsyncIterable<StreamChunk>> {
  return streamAgentChat({
    ...input,
    agent: "resume",
    systemPrompt: buildEventSourcedSystemPrompt({
      instructions: input.systemPrompt ?? "",
      resumeId: input.resumeId,
      activeResumeId: input.activeResumeId,
      activeJob: input.activeJob,
      slopGuard: input.slopGuard,
    }),
    tools: chatToolDefinitions,
    maxIterations: MAX_AGENT_ITERATIONS,
  });
}
