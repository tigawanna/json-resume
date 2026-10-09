// @vitest-environment node
import { describe, expect, it } from "vitest";
import { chatToolDefinitions } from "@/features/agentic-tools/definitions/chat-tool-definitions";
import { eventSourcedResumeAiClientTools } from "./client-tools";

describe("in-app assistant tools", () => {
  it("implements every definition the server sends to the model, and nothing else", () => {
    const sent = chatToolDefinitions.map((definition) => definition.name).sort();
    const implemented = eventSourcedResumeAiClientTools.map((tool) => tool.name).sort();

    expect(implemented).toEqual(sent);
    expect(new Set(sent).size).toBe(sent.length);
  });
});
