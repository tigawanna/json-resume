import "@tanstack/react-start/server-only";

import type { StreamChunk } from "@tanstack/ai";
import { clearToolResults, composeStrategies, evictOldest } from "@tanstack/ai-compaction";
import { dashboardChatToolDefinitions } from "@/features/agentic-tools/definitions/dashboard-tool-definitions";
import { buildDashboardSystemPrompt } from "./dashboard-system-prompt";
import {
  streamAgentChat,
  type AgentModelSettings,
  type ChatRunParams,
} from "./stream-agent-chat.server";

/** Save job, rank, read a few candidates, propose: about 6 tool calls, plus room for insight questions. */
const MAX_AGENT_ITERATIONS = 10;

/**
 * The dashboard chat never ends, so the history sent to the model is capped.
 * Old tool output (job lists, stats) goes first; the oldest turns only drop if that is not enough.
 */
const CONTEXT_BUDGET_TOKENS = 5_000;

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
    compaction: {
      maxTokens: CONTEXT_BUDGET_TOKENS,
      strategy: composeStrategies(clearToolResults(), evictOldest()),
    },
  });
}
