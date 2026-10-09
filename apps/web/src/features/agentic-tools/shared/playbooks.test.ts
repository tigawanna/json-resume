// @vitest-environment node
import { describe, expect, it } from "vitest";
import { chatToolDefinitions } from "../definitions/chat-tool-definitions";
import { playbookNameSchema } from "../resume-tool-schemas";
import { getPlaybook } from "./playbooks";

describe("get_playbook", () => {
  it("returns the steps for a named workflow", () => {
    const playbook = getPlaybook({ name: "pasted_job" });

    expect(playbook.name).toBe("pasted_job");
    expect(playbook.steps[0]).toMatch(/^save_job/);
  });

  it("only names tools the assistant has, or other playbooks", () => {
    const known = new Set<string>([
      ...chatToolDefinitions.map((definition) => definition.name),
      ...playbookNameSchema.options,
    ]);

    for (const name of playbookNameSchema.options) {
      const { when, steps } = getPlaybook({ name });
      const mentioned = [when, ...steps].join(" ").match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? [];
      expect(mentioned.filter((word) => !known.has(word))).toEqual([]);
    }
  });
});
