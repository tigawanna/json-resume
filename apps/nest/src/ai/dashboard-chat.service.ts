import { Injectable } from "@nestjs/common";
import type { PageToolPack } from "@repo/isomorphic/agentic/definitions/page-tool-pack";
import { toolsForPack } from "@repo/isomorphic/agentic/page-assistant-packs";
import {
  buildDashboardSystemPrompt,
  type DashboardPagePrompt,
} from "@repo/isomorphic/agentic/prompts/dashboard-system-prompt";
import { clearToolResults, composeStrategies, evictOldest } from "@tanstack/ai-compaction";
import type { StreamChunk } from "@tanstack/ai";
import {
  AgentChatService,
  type AgentModelSettings,
  type ChatRunParams,
} from "./agent-chat.service.js";

const MAX_AGENT_ITERATIONS = 18;
const CONTEXT_BUDGET_TOKENS = 100_000;

@Injectable()
export class DashboardChatService {
  constructor(private readonly chat: AgentChatService) {}

  streamDashboardAgentChat(
    input: ChatRunParams &
      AgentModelSettings & {
        slopGuard?: boolean;
        today: string;
        skillInstructions?: string;
        page: DashboardPagePrompt & { toolPack: PageToolPack };
        frontendOrigin: string;
        abortController: AbortController;
      },
  ): AsyncIterable<StreamChunk> {
    return this.chat.streamAgentChat({
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
}
