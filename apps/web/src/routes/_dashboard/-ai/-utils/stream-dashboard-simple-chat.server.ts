import "@tanstack/react-start/server-only";

import {
  streamAgentChat,
  type AgentModelSettings,
  type ChatRunParams,
} from "./stream-agent-chat.server";

const MAX_AGENT_ITERATIONS = 1;

export async function streamDashboardSimpleChat(
  input: ChatRunParams & AgentModelSettings,
): Promise<AsyncIterable<import("@tanstack/ai").StreamChunk>> {
  return streamAgentChat({
    ...input,
    agent: "dashboard-chat",
    systemPrompt:
      "You are a helpful assistant for a résumé library app. Reply concisely and helpfully. Do not call tools.",
    tools: [],
    maxIterations: MAX_AGENT_ITERATIONS,
  });
}
