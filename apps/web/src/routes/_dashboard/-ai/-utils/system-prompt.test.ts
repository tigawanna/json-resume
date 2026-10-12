import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT,
  SLOP_GUARD_INSTRUCTIONS,
  buildEventSourcedSystemPrompt,
} from "./system-prompt";

describe("buildEventSourcedSystemPrompt", () => {
  it("leaves the slop guard out unless it is turned on", () => {
    const prompt = buildEventSourcedSystemPrompt({ instructions: "", resumeId: "cv" });
    expect(prompt.startsWith(DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT)).toBe(true);
    expect(prompt).not.toContain(SLOP_GUARD_INSTRUCTIONS);
  });

  it("appends the slop guard after a custom prompt", () => {
    const prompt = buildEventSourcedSystemPrompt({
      instructions: "Be brief.",
      resumeId: "cv",
      slopGuard: true,
    });
    expect(prompt.startsWith(`Be brief.\n\n${SLOP_GUARD_INSTRUCTIONS}`)).toBe(true);
  });
});
