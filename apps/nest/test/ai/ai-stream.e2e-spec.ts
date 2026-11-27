import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventType, type StreamChunk } from "@tanstack/ai";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AgentChatService, type StreamAgentChatInput } from "../../src/ai/agent-chat.service.js";
import type { AppEnv } from "../../src/config/env.schema.js";
import { createTestApp } from "../support/create-test-app.js";
import { personas } from "../support/personas.js";
import { dashboardBody, resumeBody } from "./fixtures.js";

async function* scriptedStream(input: StreamAgentChatInput): AsyncGenerator<StreamChunk> {
  yield { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId };
  yield { type: EventType.TEXT_MESSAGE_START, messageId: "message-1", role: "assistant" };
  yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "message-1", delta: "Hello" };
  yield { type: EventType.TEXT_MESSAGE_END, messageId: "message-1" };
  yield {
    type: EventType.RUN_FINISHED,
    threadId: input.threadId,
    runId: input.runId,
    finishReason: "stop",
  };
}

function wireEvents(body: string): unknown[] {
  return body
    .trim()
    .split("\n\n")
    .map((line) => JSON.parse(line.replace(/^data: /, "")) as unknown);
}

describe("hosted AI SSE orchestration", () => {
  let app: INestApplication<App>;
  let closeDatabase: () => Promise<void>;
  let frontendOrigin: string;
  const streamAgentChat = vi.fn((input: StreamAgentChatInput) => scriptedStream(input));

  beforeAll(async () => {
    const started = await createTestApp({
      override: (builder) =>
        builder.overrideProvider(AgentChatService).useValue({ streamAgentChat }),
    });
    app = started.app;
    closeDatabase = started.close;
    frontendOrigin = app
      .get(ConfigService<AppEnv, true>)
      .get("FRONTEND_URL", { infer: true })
      .replace(/\/+$/, "");
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it("streams dashboard AG-UI events with the server-selected tool pack", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/ai/dashboard-assistant")
      .set("Origin", frontendOrigin)
      .set("x-mock-user", personas.member.id)
      .send({
        ...dashboardBody(),
        tools: [{ name: "client_only", description: "Must not replace server tools" }],
      })
      .expect(200);

    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.headers["access-control-allow-origin"]).toBe(frontendOrigin);
    const events = wireEvents(response.text);
    expect(events).toHaveLength(5);
    expect(events[0]).toMatchObject({
      type: EventType.RUN_STARTED,
      threadId: "ai-thread-1",
      runId: "ai-run-1",
    });
    expect(events[2]).toMatchObject({ type: EventType.TEXT_MESSAGE_CONTENT, delta: "Hello" });
    expect(events[4]).toMatchObject({ type: EventType.RUN_FINISHED, runId: "ai-run-1" });
    const [input] = streamAgentChat.mock.calls[0] ?? [];
    expect(input).toMatchObject({
      agent: "dashboard",
      userId: personas.member.id,
      threadId: "ai-thread-1",
      runId: "ai-run-1",
      frontendOrigin,
      tools: [{ name: "search_conversations" }],
      maxIterations: 18,
      abortController: expect.any(AbortController),
    });
  });

  it("streams résumé events with all shared definitions and run lineage", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/ai/event-sourced-resume-tailor")
      .set("Origin", frontendOrigin)
      .set("x-mock-user", personas.member.id)
      .send({ ...resumeBody(), parentRunId: "parent-run-1" })
      .expect(200);

    const events = wireEvents(response.text);
    expect(events).toHaveLength(5);
    expect(events[0]).toMatchObject({ type: EventType.RUN_STARTED, runId: "ai-run-1" });
    expect(events[4]).toMatchObject({ type: EventType.RUN_FINISHED, runId: "ai-run-1" });
    const [input] = streamAgentChat.mock.calls[1] ?? [];
    expect(input).toMatchObject({
      agent: "resume",
      resumeId: "resume-1",
      parentRunId: "parent-run-1",
      maxIterations: 16,
    });
    expect(input?.tools).toHaveLength(40);
    expect(input?.systemPrompt).toContain("resume-1");
  });
});
