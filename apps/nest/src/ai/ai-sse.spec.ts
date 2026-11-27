import { once } from "node:events";
import { createServer } from "node:http";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { describe, expect, it } from "vitest";
import { sendAiSse } from "./ai-sse.js";

const frontendOrigin = "http://localhost:3040";

async function startSseServer({
  stream,
  abortController,
}: {
  stream: AsyncIterable<StreamChunk>;
  abortController: AbortController;
}) {
  const server = createServer(async (_request, response) => {
    await sendAiSse({ response, stream, frontendOrigin, abortController });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function* completeStream(): AsyncGenerator<StreamChunk> {
  yield { type: EventType.RUN_STARTED, threadId: "thread-1", runId: "run-1" };
  yield { type: EventType.TEXT_MESSAGE_START, messageId: "message-1", role: "assistant" };
  yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "message-1", delta: "Hello" };
  yield { type: EventType.TEXT_MESSAGE_END, messageId: "message-1" };
  yield {
    type: EventType.RUN_FINISHED,
    threadId: "thread-1",
    runId: "run-1",
    finishReason: "stop",
  };
}

describe("AI SSE transport", () => {
  it("preserves TanStack SSE bytes and credentialed CORS headers", async () => {
    const server = await startSseServer({
      stream: completeStream(),
      abortController: new AbortController(),
    });
    try {
      const response = await fetch(server.url);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(response.headers.get("cache-control")).toBe("no-cache");
      expect(response.headers.get("access-control-allow-origin")).toBe(frontendOrigin);
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
      expect(response.headers.get("access-control-allow-headers")).toContain("X-Run-Id");
      const body = await response.text();
      expect(body).toContain('"type":"RUN_STARTED"');
      expect(body).toContain('"delta":"Hello"');
      expect(body).toContain('"type":"RUN_FINISHED"');
      expect(body).not.toContain("event:");
      expect(body).not.toContain("id:");
    } finally {
      await server.close();
    }
  });

  it("aborts the shared model controller when the client disconnects", async () => {
    const abortController = new AbortController();
    async function* pendingStream(): AsyncGenerator<StreamChunk> {
      yield { type: EventType.RUN_STARTED, threadId: "thread-1", runId: "run-1" };
      await new Promise<void>((resolve) => {
        abortController.signal.addEventListener("abort", () => resolve(), { once: true });
      });
    }
    const server = await startSseServer({ stream: pendingStream(), abortController });
    try {
      const response = await fetch(server.url);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Missing SSE response body");
      await reader.read();
      const aborted = once(abortController.signal, "abort");
      await reader.cancel();
      await aborted;
      expect(abortController.signal.aborted).toBe(true);
    } finally {
      await server.close();
    }
  });
});
