// @vitest-environment node
import { describe, expect, it } from "vitest";
import { classifyChatError, failedRunHasReply } from "@/lib/openrouter/chat-error";

describe("classifyChatError", () => {
  it.each([
    ["Rate limit exceeded: free-models-per-min.", "rate-limit"],
    ["429 Too Many Requests", "rate-limit"],
    ["Rate limit exceeded: free-models-per-day. Add 10 credits to unlock", "daily-limit"],
    ["Request timed out", "timeout"],
    ["TypeError: fetch failed", "timeout"],
    ["504 Gateway Timeout", "timeout"],
    ["401 No auth credentials found", "api-key"],
    ["Model returned malformed JSON", "other"],
  ])("reads %j as %s", (message, kind) => {
    expect(classifyChatError(message)).toBe(kind);
  });
});

describe("failedRunHasReply", () => {
  it("resends the prompt when the run produced nothing", () => {
    expect(failedRunHasReply([{ role: "assistant" }, { role: "user" }])).toBe(false);
    expect(failedRunHasReply([])).toBe(false);
  });

  it("continues when the run got partway", () => {
    expect(failedRunHasReply([{ role: "user" }, { role: "assistant" }])).toBe(true);
  });
});
