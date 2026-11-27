import { searchConversationsToolDefinition } from "@repo/isomorphic/agentic/definitions/assistant-data-definitions";
import { describe, expect, it, vi } from "vitest";
import { AgentChatService } from "./agent-chat.service.js";

const mocks = vi.hoisted(() => {
  const stream = (async function* () {})();
  return { stream, chat: vi.fn((_options: Record<string, unknown>) => stream) };
});

vi.mock("@tanstack/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/ai")>();
  return { ...actual, chat: mocks.chat };
});

describe("AgentChatService", () => {
  it("keeps BYOK orchestration stateless and shares the abort controller", () => {
    const service = new AgentChatService();
    const abortController = new AbortController();
    const result = service.streamAgentChat({
      agent: "resume",
      systemPrompt: "Tailor the résumé.",
      tools: [searchConversationsToolDefinition],
      maxIterations: 16,
      messages: [{ id: "message-1", role: "user", content: "Hello" }],
      threadId: "thread-1",
      runId: "run-1",
      parentRunId: "parent-1",
      resume: [],
      userId: "user-1",
      apiKey: "test-key",
      model: "anthropic/claude-sonnet-4.5",
      routing: {
        mode: "custom",
        providers: ["anthropic"],
        allowFallbacks: false,
        maxOutputTokens: 8_192,
      },
      frontendOrigin: "http://localhost:3040",
      abortController,
    });

    expect(result).toBe(mocks.stream);
    expect(mocks.chat).toHaveBeenCalledOnce();
    expect(mocks.chat.mock.calls[0]?.[0]).toMatchObject({
      adapter: { name: "openrouter" },
      messages: [{ id: "message-1", role: "user", content: "Hello" }],
      threadId: "thread-1",
      runId: "run-1",
      parentRunId: "parent-1",
      resume: [],
      abortController,
      systemPrompts: [
        {
          content: "Tailor the résumé.",
          metadata: { cache_control: { type: "ephemeral" } },
        },
      ],
      modelOptions: {
        provider: {
          requireParameters: true,
          order: ["anthropic"],
          allowFallbacks: false,
        },
        maxCompletionTokens: 8_192,
        sessionId: "thread-1",
        user: "user-1",
      },
      tools: [{ name: "search_conversations" }],
      lazyToolsConfig: { includeDescription: "first-sentence" },
      middleware: [{ name: "openrouter-usage-log" }],
    });
  });
});
