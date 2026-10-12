// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dashboardChatToolDefinitions } from "@/features/agentic-tools/definitions/dashboard-tool-definitions";
import { dashboardAssistantClientTools } from "./dashboard-client-tools";

describe("dashboard assistant tools", () => {
  it("implements every definition the server sends to the model, and nothing else", () => {
    const sent = dashboardChatToolDefinitions.map((definition) => definition.name).sort();
    const implemented = dashboardAssistantClientTools.map((tool) => tool.name).sort();

    expect(implemented).toEqual(sent);
    expect(new Set(sent).size).toBe(sent.length);
  });

  it("asks the user before it copies or opens a résumé", () => {
    const gated = dashboardAssistantClientTools
      .filter((tool) => tool.needsApproval)
      .map((tool) => tool.name);

    expect(gated).toEqual(["start_resume_for_job"]);
  });

  it("never edits résumés", () => {
    const names = dashboardChatToolDefinitions.map((definition) => definition.name);

    expect(
      names.filter((name) => /^(set_|upsert_|remove_|replace_|clone_|tailor_)/.test(name)),
    ).toEqual([]);
  });
});
