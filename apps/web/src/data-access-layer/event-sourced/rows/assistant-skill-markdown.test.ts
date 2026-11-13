import { describe, expect, it } from "vite-plus/test";
import {
  composeSkillMarkdown,
  parseSkillMarkdown,
  skillDocument,
  skillExcerpt,
} from "./assistant-skill-markdown";

describe("skill markdown", () => {
  it("round-trips name, description, and the instructions", () => {
    const document = composeSkillMarkdown({
      name: "Developer bullets",
      description: "One change per line: verb, system, and a real outcome.",
      body: "Do not invent metrics.",
    });
    expect(document.startsWith("---\nname: Developer bullets\n")).toBe(true);
    expect(parseSkillMarkdown(document)).toEqual({
      name: "Developer bullets",
      description: "One change per line: verb, system, and a real outcome.",
      body: "Do not invent metrics.",
    });
  });

  it("wraps a plain body so older skills still have front matter", () => {
    const document = skillDocument({ name: "Voice", body: "Write the way I talk." });
    expect(document).toContain("name: Voice");
    expect(skillExcerpt({ name: "Voice", body: "Write the way I talk." })).toBe(
      "Write the way I talk.",
    );
  });
});
