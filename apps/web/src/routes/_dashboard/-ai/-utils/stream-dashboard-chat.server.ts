import "@tanstack/react-start/server-only";

import type { StreamChunk } from "@tanstack/ai";
import { dashboardChatToolDefinitions } from "@/features/agentic-tools/definitions/dashboard-tool-definitions";
import { buildDashboardSystemPrompt } from "./dashboard-system-prompt";
import {
  streamAgentChat,
  type AgentModelSettings,
  type ChatRunParams,
} from "./stream-agent-chat.server";

/** Save job, rank, read a few candidates, propose: about 6 tool calls, plus room for insight questions. */
const MAX_AGENT_ITERATIONS = 10;

export async function streamDashboardAgentChat(
  input: ChatRunParams &
    AgentModelSettings & {
      slopGuard?: boolean;
      today: string;
    },
): Promise<AsyncIterable<StreamChunk>> {
  return streamAgentChat({
    ...input,
    agent: "dashboard",
    systemPrompt: buildDashboardSystemPrompt({ slopGuard: input.slopGuard, today: input.today }),
    tools: dashboardChatToolDefinitions,
    maxIterations: MAX_AGENT_ITERATIONS,
  });
}
