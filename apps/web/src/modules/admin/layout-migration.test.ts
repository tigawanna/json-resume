import { describe, expect, it } from "vitest";
import { emptyResumeLayout, type LayoutEntityKey } from "@/features/resume/resume-layout";
import {
  layoutFromLegacyLinks,
  planLayoutMigration,
  type LegacyLinkData,
} from "./layout-migration";

function data(patch: Partial<LegacyLinkData>): LegacyLinkData {
  return {
    resumes: [{ id: "r1", userId: "u", layout: null }],
    sections: [],
    links: new Map(),
    existing: new Map(),
    bullets: [],
    bulletLinks: [],
    skills: [],
    groupSkills: [],
    groups: [],
    ...patch,
  };
}

const legacy = data({
  sections: [
    { resumeId: "r1", key: "skills", title: "Tools", enabled: false, sortOrder: 1 },
    { resumeId: "r1", key: "header", title: "Me", enabled: true, sortOrder: 0 },
  ],
  links: new Map<LayoutEntityKey, LegacyLinkData["bulletLinks"]>([
    [
      "experiences",
      [
        { resumeId: "r1", entityId: "linked", sortOrder: 0 },
        { resumeId: "r1", entityId: "legacy", sortOrder: 1 },
        { resumeId: "r2", entityId: "other", sortOrder: 0 },
        { resumeId: "r1", entityId: "deleted", sortOrder: 2 },
      ],
    ],
    [
      "skillGroups",
      [
        { resumeId: "r1", entityId: "g-links", sortOrder: 0 },
        { resumeId: "r1", entityId: "g-legacy", sortOrder: 1 },
      ],
    ],
  ]),
  existing: new Map<LayoutEntityKey, Set<string>>([
    ["experiences", new Set(["legacy", "linked", "other"])],
    ["skillGroups", new Set(["g-links", "g-legacy"])],
  ]),
  bullets: [
    { id: "l2", experienceId: "legacy", sortOrder: 1 },
    { id: "l1", experienceId: "legacy", sortOrder: 0 },
    { id: "k1", experienceId: "linked", sortOrder: 0 },
    { id: "k2", experienceId: "linked", sortOrder: 1 },
  ],
  bulletLinks: [
    { resumeId: "r1", entityId: "k2", sortOrder: 0 },
    { resumeId: "r2", entityId: "k1", sortOrder: 0 },
  ],
  skills: [
    { id: "ts", groupId: null, sortOrder: 0 },
    { id: "go", groupId: null, sortOrder: 1 },
    { id: "cobol", groupId: "g-legacy", sortOrder: 0 },
  ],
  groupSkills: [
    { groupId: "g-links", skillId: "go", sortOrder: 0 },
    { groupId: "g-links", skillId: "ts", sortOrder: 1 },
  ],
});

describe("layoutFromLegacyLinks", () => {
  it("applies the legacy rules and drops links to missing rows", () => {
    expect(layoutFromLegacyLinks("r1", legacy)).toEqual({
      ...emptyResumeLayout(),
      sections: [
        { key: "header", title: "Me", enabled: true },
        { key: "skills", title: "Tools", enabled: false },
      ],
      experiences: [
        { id: "linked", bullets: ["k2"] },
        { id: "legacy", bullets: ["l1", "l2"] },
      ],
      skillGroups: [
        { id: "g-links", skills: ["go", "ts"] },
        { id: "g-legacy", skills: ["cobol"] },
      ],
    });
  });

  it("gives a résumé with no section rows the default sections", () => {
    expect(layoutFromLegacyLinks("r1", data({})).sections).toEqual(emptyResumeLayout().sections);
  });
});

describe("planLayoutMigration", () => {
  it("keeps stored layouts and merges same-named groups into the newest, unioning skills", () => {
    const stored = {
      ...emptyResumeLayout(),
      skillGroups: [
        { id: "old", skills: ["a", "b"] },
        { id: "new", skills: ["b", "c"] },
      ],
    };
    const plan = planLayoutMigration(
      data({
        resumes: [{ id: "r1", userId: "u", layout: stored }],
        groups: [
          { id: "old", userId: "u", name: "Frontend", updatedAt: 1 },
          { id: "new", userId: "u", name: " frontend", updatedAt: 2 },
          { id: "theirs", userId: "v", name: "Frontend", updatedAt: 3 },
        ],
      }),
    );
    expect(plan.derived).toEqual([]);
    expect(plan.groupMerges).toEqual([{ from: "old", to: "new" }]);
    expect(plan.layouts.get("r1")?.skillGroups).toEqual([{ id: "new", skills: ["a", "b", "c"] }]);
  });
});
