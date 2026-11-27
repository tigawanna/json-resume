import { once } from "node:events";
import type { ServerResponse } from "node:http";
import { toServerSentEventsResponse, type StreamChunk } from "@tanstack/ai";

export async function sendAiSse({
  response,
  stream,
  frontendOrigin,
  abortController,
}: {
  response: ServerResponse;
  stream: AsyncIterable<StreamChunk>;
  frontendOrigin: string;
  abortController: AbortController;
}) {
  const sse = toServerSentEventsResponse(stream, { abortController });
  setAiCors({ response, frontendOrigin });
  for (const [key, value] of sse.headers) response.setHeader(key, value);
  response.statusCode = sse.status;
  response.on("close", () => {
    if (!response.writableFinished) abortController.abort();
  });

  if (!sse.body) {
    response.end();
    return;
  }
  const reader = sse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!response.write(Buffer.from(value))) await once(response, "drain");
    }
  } finally {
    reader.releaseLock();
    if (!response.writableEnded) response.end();
  }
}

export function setAiCors({
  response,
  frontendOrigin,
}: {
  response: ServerResponse;
  frontendOrigin: string;
}) {
  response.setHeader("Access-Control-Allow-Origin", frontendOrigin);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Run-Id");
  response.setHeader("Vary", "Origin");
}

export function sendAiJsonError({
  response,
  frontendOrigin,
  message,
  status,
}: {
  response: ServerResponse;
  frontendOrigin: string;
  message: string;
  status: number;
}) {
  setAiCors({ response, frontendOrigin });
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ error: message }));
}
