import "@tanstack/react-start/server-only";

import type { StreamChunk } from "@tanstack/ai";
import { clearToolResults, composeStrategies, evictOldest } from "@tanstack/ai-compaction";
import type { PageToolPack } from "@/features/agentic-tools/definitions/tool-context";
import { toolsForPack } from "@/features/agentic-tools/page-assistant-packs";
import { buildDashboardSystemPrompt, type DashboardPagePrompt } from "./dashboard-system-prompt";
import {
  streamAgentChat,
  type AgentModelSettings,
  type ChatRunParams,
} from "./stream-agent-chat.server";

/** Job flow is about 6 calls; first-résumé intake is several ask_user rounds plus create. */
const MAX_AGENT_ITERATIONS = 18;

/**
 * The dashboard chat never ends, so the history sent to the model is capped.
 * Old tool output (job lists, stats) goes first; the oldest turns only drop if that is not enough.
 */
const CONTEXT_BUDGET_TOKENS = 100_000;

export async function streamDashboardAgentChat(
  input: ChatRunParams &
    AgentModelSettings & {
      slopGuard?: boolean;
      today: string;
      skillInstructions?: string;
      page: DashboardPagePrompt & { toolPack: PageToolPack };
    },
): Promise<AsyncIterable<StreamChunk>> {
  return streamAgentChat({
    ...input,
    agent: "dashboard",
    systemPrompt: buildDashboardSystemPrompt({
      slopGuard: input.slopGuard,
      today: input.today,
      skillInstructions: input.skillInstructions,
      page: input.page,
    }),
    tools: toolsForPack(input.page.toolPack),
    maxIterations: MAX_AGENT_ITERATIONS,
    compaction: {
      maxTokens: CONTEXT_BUDGET_TOKENS,
      strategy: composeStrategies(clearToolResults(), evictOldest()),
    },
  });
}
