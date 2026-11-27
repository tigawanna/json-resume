import type { IncomingMessage } from "node:http";

const MAX_BODY_BYTES = 15 * 1024 * 1024;

export class AiPayloadError extends Error {}

export async function readJsonBody({ request }: { request: IncomingMessage }): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const value of request) {
    const chunk: unknown = value;
    if (typeof chunk !== "string" && !Buffer.isBuffer(chunk)) {
      throw new AiPayloadError("Invalid AI request body");
    }
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new AiPayloadError("AI request body is too large");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AiPayloadError("Invalid AI request payload");
  }
}
