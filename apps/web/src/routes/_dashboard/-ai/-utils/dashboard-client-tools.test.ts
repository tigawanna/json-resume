// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";
import {
  pageAssistantToolDefinitions,
  toolsForPack,
} from "@/features/agentic-tools/page-assistant-packs";
import { pageAssistantClientTools } from "./page-assistant-client-tools";

describe("page assistant tools", () => {
  it("implements every definition the bubble can run", () => {
    const sent = pageAssistantToolDefinitions.map((definition) => definition.name).sort();
    const implemented = pageAssistantClientTools.map((tool) => tool.name).sort();

    expect(implemented).toEqual(sent);
    expect(new Set(sent).size).toBe(sent.length);
  });

  it("asks before it changes a row or opens a résumé", () => {
    const gated = pageAssistantClientTools
      .filter((tool) => tool.needsApproval)
      .map((tool) => tool.name)
      .sort();

    expect(gated).toEqual(["mutate_collection", "start_resume_for_job"]);
  });

  it("keeps résumé document edits off the bubble", () => {
    const names = pageAssistantToolDefinitions.map((definition) => definition.name);

    expect(
      names.filter((name) =>
        /^(upsert_|remove_from_resume|replace_|clone_|tailor_|set_summary|set_skills|set_contacts|set_links|set_notes|set_experience_bullets)/.test(
          name,
        ),
      ),
    ).toEqual([]);
  });

  it("sends only the pack for the page", () => {
    expect(toolsForPack("none").map((tool) => tool.name)).toEqual(["search_conversations"]);
    expect(toolsForPack("library").map((tool) => tool.name)).toEqual([
      "query_collection",
      "mutate_collection",
      "search_conversations",
    ]);
    expect(toolsForPack("experience").map((tool) => tool.name)).toContain(
      "set_experience_title_bullets",
    );
    expect(toolsForPack("job").map((tool) => tool.name)).not.toContain(
      "set_experience_title_bullets",
    );
    expect(toolsForPack("resume-list").map((tool) => tool.name)).toContain("list_resumes");
    expect(toolsForPack("resume-list").map((tool) => tool.name)).toContain("query_collection");
    expect(toolsForPack("resume-list").map((tool) => tool.name)).not.toContain(
      "set_experience_title_bullets",
    );
  });
});
