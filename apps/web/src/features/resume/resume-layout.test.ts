import { describe, expect, it } from "vitest";
import {
  addEntity,
  emptyResumeLayout,
  layoutIds,
  layoutReferencedIds,
  removeEntity,
  removeIdEverywhere,
  replaceId,
  resumeLayoutSchema,
  setEntities,
  setExperienceBullets,
  setGroupSkills,
  swapEntities,
  type ResumeLayout,
} from "./resume-layout";

function layout(overrides: Partial<ResumeLayout> = {}): ResumeLayout {
  return { ...emptyResumeLayout(), sections: [], ...overrides };
}

describe("resumeLayoutSchema", () => {
  it("fills missing lists so older layouts still parse", () => {
    const parsed = resumeLayoutSchema.parse({ experiences: [{ id: "e1" }], projects: ["p1"] });
    expect(parsed.experiences).toEqual([{ id: "e1", bullets: [] }]);
    expect(parsed.projects).toEqual(["p1"]);
    expect(parsed.talks).toEqual([]);
    expect(parsed.sections).toEqual([]);
  });

  it("keeps array order through a JSON round trip", () => {
    const value = layout({ projects: ["c", "a", "b"] });
    expect(resumeLayoutSchema.parse(JSON.parse(JSON.stringify(value))).projects).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});

describe("emptyResumeLayout", () => {
  it("enables every section with its default title", () => {
    const sections = emptyResumeLayout().sections;
    expect(sections[0]).toEqual({ key: "header", title: "Profile", enabled: true });
    expect(sections.find((section) => section.key === "skills")?.title).toBe("Skills");
  });
});

describe("list helpers", () => {
  it("appends once", () => {
    const next = addEntity(addEntity(layout(), "projects", "p1"), "projects", "p1");
    expect(next.projects).toEqual(["p1"]);
  });

  it("adds experiences and skill groups with empty selections", () => {
    const next = addEntity(addEntity(layout(), "experiences", "e1"), "skillGroups", "g1");
    expect(next.experiences).toEqual([{ id: "e1", bullets: [] }]);
    expect(next.skillGroups).toEqual([{ id: "g1", skills: [] }]);
  });

  it("removes from one list only", () => {
    const next = removeEntity(layout({ projects: ["x"], talks: ["x"] }), "projects", "x");
    expect(next.projects).toEqual([]);
    expect(next.talks).toEqual(["x"]);
  });

  it("swaps two ids and keeps nested selections", () => {
    const start = layout({
      experiences: [
        { id: "a", bullets: ["a1"] },
        { id: "b", bullets: ["b1"] },
        { id: "c", bullets: [] },
      ],
    });
    const next = swapEntities(start, "experiences", "a", "c");
    expect(next.experiences).toEqual([
      { id: "c", bullets: [] },
      { id: "b", bullets: ["b1"] },
      { id: "a", bullets: ["a1"] },
    ]);
  });

  it("ignores a swap with an id that is not in the list", () => {
    const start = layout({ talks: ["a", "b"] });
    expect(swapEntities(start, "talks", "a", "missing")).toBe(start);
  });

  it("replaces a list, keeping selections for ids that stay", () => {
    const start = layout({
      skillGroups: [
        { id: "g1", skills: ["s1"] },
        { id: "g2", skills: ["s2"] },
      ],
    });
    const next = setEntities(start, "skillGroups", ["g3", "g1", "g1"]);
    expect(next.skillGroups).toEqual([
      { id: "g3", skills: [] },
      { id: "g1", skills: ["s1"] },
    ]);
    expect(layoutIds(next, "skillGroups")).toEqual(["g3", "g1"]);
  });
});

describe("nested selections", () => {
  it("sets bullets, adding the experience when missing", () => {
    const next = setExperienceBullets(layout(), "e1", ["b2", "b1", "b2"]);
    expect(next.experiences).toEqual([{ id: "e1", bullets: ["b2", "b1"] }]);
  });

  it("sets skills on an existing group in place", () => {
    const start = layout({
      skillGroups: [
        { id: "g1", skills: [] },
        { id: "g2", skills: ["old"] },
      ],
    });
    const next = setGroupSkills(start, "g2", ["s1", "s2"]);
    expect(next.skillGroups).toEqual([
      { id: "g1", skills: [] },
      { id: "g2", skills: ["s1", "s2"] },
    ]);
  });
});

describe("removeIdEverywhere", () => {
  it("strips the id from lists, bullets and skills", () => {
    const start = layout({
      experiences: [{ id: "e1", bullets: ["x", "b1"] }],
      skillGroups: [{ id: "g1", skills: ["x"] }],
      projects: ["x", "p1"],
    });
    const next = removeIdEverywhere(start, "x");
    expect(next.experiences).toEqual([{ id: "e1", bullets: ["b1"] }]);
    expect(next.skillGroups).toEqual([{ id: "g1", skills: [] }]);
    expect(next.projects).toEqual(["p1"]);
  });

  it("drops a removed experience with its bullets", () => {
    const next = removeIdEverywhere(layout({ experiences: [{ id: "e1", bullets: ["b1"] }] }), "e1");
    expect(next.experiences).toEqual([]);
  });
});

describe("replaceId", () => {
  it("repoints a skill inside groups without duplicating it", () => {
    const start = layout({ skillGroups: [{ id: "g1", skills: ["dup", "keep", "s1"] }] });
    expect(replaceId(start, "dup", "keep").skillGroups).toEqual([
      { id: "g1", skills: ["keep", "s1"] },
    ]);
  });

  it("merges two groups into the earlier position with the union of skills", () => {
    const start = layout({
      skillGroups: [
        { id: "from", skills: ["s1", "s2"] },
        { id: "g2", skills: [] },
        { id: "to", skills: ["s2", "s3"] },
      ],
    });
    expect(replaceId(start, "from", "to").skillGroups).toEqual([
      { id: "to", skills: ["s1", "s2", "s3"] },
      { id: "g2", skills: [] },
    ]);
  });

  it("renames in flat lists", () => {
    expect(replaceId(layout({ links: ["a", "b"] }), "a", "c").links).toEqual(["c", "b"]);
  });
});

describe("layoutReferencedIds", () => {
  it("collects list ids, bullets and skills", () => {
    const ids = layoutReferencedIds(
      layout({
        experiences: [{ id: "e1", bullets: ["b1"] }],
        skillGroups: [{ id: "g1", skills: ["s1"] }],
        contacts: ["c1"],
      }),
    );
    expect([...ids].sort()).toEqual(["b1", "c1", "e1", "g1", "s1"]);
  });
});
