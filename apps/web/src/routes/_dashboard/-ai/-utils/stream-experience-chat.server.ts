import "@tanstack/react-start/server-only";

import type { StreamChunk } from "@tanstack/ai";
import { experienceToolDefinitions } from "@/features/agentic-tools/definitions/experience-definitions";
import type { ExperienceGroupSnapshot } from "@/features/agentic-tools/experience-snapshot";
import {
  streamAgentChat,
  type AgentModelSettings,
  type ChatRunParams,
} from "./stream-agent-chat.server";
import { buildExperienceSystemPrompt } from "./experience-system-prompt";

/** Enough model turns to read the group, condense one title, and reuse it across the rest. */
const MAX_AGENT_ITERATIONS = 12;

export async function streamExperienceAgentChat(
  input: ChatRunParams &
    AgentModelSettings & {
      snapshot: ExperienceGroupSnapshot;
    },
): Promise<AsyncIterable<StreamChunk>> {
  return streamAgentChat({
    ...input,
    agent: "experiences",
    systemPrompt: buildExperienceSystemPrompt({ snapshot: input.snapshot }),
    tools: experienceToolDefinitions,
    maxIterations: MAX_AGENT_ITERATIONS,
  });
}
