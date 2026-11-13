import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_PLACEMENT_BRIEF, formatPlacementBrief } from "./placement-brief";

describe("formatPlacementBrief", () => {
  it("stays honest and does not invent a home when the defaults are left as they are", () => {
    const text = formatPlacementBrief(DEFAULT_PLACEMENT_BRIEF);
    expect(text).toContain("Keep it honest");
    expect(text).toContain("No specific skill to place");
    expect(text).toContain("Weave it into a bullet");
  });

  it("records an all-in request and an Other note for where the skill goes", () => {
    const text = formatPlacementBrief({
      ...DEFAULT_PLACEMENT_BRIEF,
      depth: "all-in",
      skillChoices: ["other"],
      skillNote: "Kubernetes",
      experienceChoices: ["other"],
      experienceNote: "Only the platform role, I ran the cluster, I did not design it",
      insertion: "other",
      insertionNote: "One clause inside the existing on-call bullet",
    });
    expect(text).toContain("skill: Kubernetes");
    expect(text).toContain("experience_id: Only the platform role");
    expect(text).toContain("insertion_note: One clause inside the existing on-call bullet");
    expect(text).toContain("depth: go all in");
  });
});
