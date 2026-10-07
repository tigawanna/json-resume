import { describe, expect, it } from "vitest";
import { planCompaction, type CompactionOp } from "./compact-plan";

const now = new Date(10_000);
const at = (ms: number) => ({ createdAt: new Date(ms), updatedAt: new Date(ms) });

function counter() {
  let n = 0;
  return () => `new-${++n}`;
}

/** Applies ops to a copy of the input so tests can assert on the end state. */
function apply(input: Record<string, Record<string, unknown>[]>, ops: CompactionOp[]) {
  const out: Record<string, Map<string, Record<string, unknown>>> = {};
  for (const [id, rows] of Object.entries(input)) {
    out[id] = new Map(rows.map((row) => [String(row.id), row]));
  }
  for (const op of ops) {
    const table = (out[op.collectionId] ??= new Map());
    if (op.type === "delete") table.delete(op.id);
    else table.set(op.id, op.row);
  }
  return out;
}

function bulletsShown(state: ReturnType<typeof apply>, resumeId: string) {
  return [...(state.resumeExperienceBulletItem?.values() ?? [])]
    .filter((item) => item.resumeId === resumeId)
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((item) => state.resumeExperienceBullet?.get(String(item.bulletId))?.text);
}

function skillsShown(state: ReturnType<typeof apply>, resumeId: string) {
  const groups = [...(state.resumeSkillGroupItem?.values() ?? [])]
    .filter((item) => item.resumeId === resumeId)
    .map((item) => String(item.groupId));
  return groups.map((groupId) =>
    [...(state.resumeSkillGroupSkill?.values() ?? [])]
      .filter((link) => link.groupId === groupId)
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
      .map((link) => state.resumeSkill?.get(String(link.skillId))?.name),
  );
}

describe("planCompaction", () => {
  const input = {
    resume: [
      { id: "r1", userId: "u", ...at(1) },
      { id: "r2", userId: "u", ...at(1) },
    ],
    resumeExperience: [
      { id: "e1", userId: "u", company: "Acme", role: "Dev", startDate: "2020", ...at(1) },
      { id: "e2", userId: "u", company: " acme ", role: "dev", startDate: "2020", ...at(2) },
    ],
    resumeExperienceItem: [
      { id: "ei1", resumeId: "r1", experienceId: "e1", sortOrder: 0, ...at(1) },
      { id: "ei2", resumeId: "r2", experienceId: "e2", sortOrder: 0, ...at(1) },
    ],
    resumeExperienceBullet: [
      { id: "b1", experienceId: "e1", text: "Shipped X", sortOrder: 0, ...at(1) },
      { id: "b2", experienceId: "e1", text: "Led Y", sortOrder: 1, ...at(1) },
      { id: "b3", experienceId: "e2", text: "Shipped X", sortOrder: 0, ...at(1) },
    ],
    resumeExperienceBulletItem: [],
    resumeSkillGroup: [
      { id: "g1", userId: "u", name: "Frontend", ...at(1) },
      { id: "g2", userId: "u", name: "Frontend", ...at(2) },
    ],
    resumeSkillGroupItem: [
      { id: "gi1", resumeId: "r1", groupId: "g1", sortOrder: 0, ...at(1) },
      { id: "gi2", resumeId: "r2", groupId: "g2", sortOrder: 0, ...at(1) },
    ],
    resumeSkill: [
      { id: "s1", groupId: "g1", name: "React", sortOrder: 0, ...at(1) },
      { id: "s2", groupId: "g1", name: "CSS", sortOrder: 1, ...at(1) },
      { id: "s3", groupId: "g2", name: "react", sortOrder: 0, ...at(1) },
      { id: "s4", groupId: "g2", name: "CSS", sortOrder: 1, ...at(1) },
    ],
    resumeSkillGroupSkill: [],
  };

  const plan = planCompaction(input, { userId: "u", now, newId: counter() });
  const state = apply(input, plan.ops);

  it("keeps one row per experience, bullet text, skill and identical group", () => {
    expect(state.resumeExperience?.size).toBe(1);
    expect(state.resumeExperienceBullet?.size).toBe(2);
    expect(state.resumeSkill?.size).toBe(2);
    expect(state.resumeSkillGroup?.size).toBe(1);
  });

  it("leaves every résumé showing exactly what it showed before", () => {
    expect(bulletsShown(state, "r1")).toEqual(["Shipped X", "Led Y"]);
    expect(bulletsShown(state, "r2")).toEqual(["Shipped X"]);
    expect(skillsShown(state, "r1")).toEqual([["React", "CSS"]]);
    expect(skillsShown(state, "r2")).toEqual([["React", "CSS"]]);
  });

  it("moves skills off the legacy group column and onto the owner", () => {
    for (const skill of state.resumeSkill?.values() ?? []) {
      expect(skill.groupId).toBeNull();
      expect(skill.userId).toBe("u");
    }
  });

  it("orders events so children are repointed before their old parent goes", () => {
    const index = (type: string, collectionId: string, id: string) =>
      plan.ops.findIndex(
        (op) => op.type === type && op.collectionId === collectionId && op.id === id,
      );
    const loser = state.resumeExperience?.has("e1") ? "e2" : "e1";
    const repoint = plan.ops.findIndex(
      (op) => op.type === "update" && op.collectionId === "resumeExperienceItem",
    );
    expect(repoint).toBeGreaterThanOrEqual(0);
    expect(repoint).toBeLessThan(index("delete", "resumeExperience", loser));
  });

  it("keeps links to entities that were not loaded (legacy rows without user_id)", () => {
    const partial = {
      resume: [{ id: "r1", userId: "u", ...at(1) }],
      resumeProject: [],
      resumeProjectItem: [
        { id: "pi1", resumeId: "r1", projectId: "p-legacy", sortOrder: 0, ...at(1) },
      ],
      resumeTalk: [],
      resumeTalkItem: [{ id: "ti1", resumeId: "r1", talkId: "t-legacy", sortOrder: 0, ...at(1) }],
    };
    const ops = planCompaction(partial, { userId: "u", now }).ops;
    expect(ops.filter((op) => op.type === "delete")).toEqual([]);
  });

  it("does nothing once the data is already unique", () => {
    const settled = Object.fromEntries(
      Object.entries(state).map(([id, rows]) => [id, [...rows.values()]]),
    );
    expect(planCompaction(settled, { userId: "u", now }).ops).toEqual([]);
  });
});

describe("planCompaction with prune", () => {
  const input = {
    resume: [{ id: "r1", userId: "u", ...at(1) }],
    resumeExperience: [
      { id: "e1", userId: "u", company: "Acme", role: "Dev", startDate: "2020", ...at(1) },
      { id: "e2", userId: "u", company: "Old", role: "Dev", startDate: "2010", ...at(1) },
    ],
    resumeExperienceItem: [
      { id: "ei1", resumeId: "r1", experienceId: "e1", sortOrder: 0, ...at(1) },
    ],
    resumeExperienceBullet: [
      { id: "b1", experienceId: "e1", text: "Shipped X", sortOrder: 0, ...at(1) },
      { id: "b2", experienceId: "e1", text: "Unused draft", sortOrder: 1, ...at(1) },
      { id: "b3", experienceId: "e2", text: "Old work", sortOrder: 0, ...at(1) },
    ],
    resumeExperienceBulletItem: [
      { id: "bi1", resumeId: "r1", bulletId: "b1", sortOrder: 0, ...at(1) },
    ],
    resumeSkillGroup: [
      { id: "g1", userId: "u", name: "Frontend", ...at(1) },
      { id: "g2", userId: "u", name: "Frontend", ...at(1) },
    ],
    resumeSkillGroupItem: [{ id: "gi1", resumeId: "r1", groupId: "g1", sortOrder: 0, ...at(1) }],
    resumeSkill: [
      { id: "s1", userId: "u", name: "React", ...at(1) },
      { id: "s2", userId: "u", name: "Vue", ...at(1) },
      { id: "s3", userId: "u", name: "Unlinked", ...at(1) },
    ],
    resumeSkillGroupSkill: [
      { id: "l1", groupId: "g1", skillId: "s1", sortOrder: 0, ...at(1) },
      { id: "l2", groupId: "g2", skillId: "s1", sortOrder: 0, ...at(1) },
      { id: "l3", groupId: "g2", skillId: "s2", sortOrder: 1, ...at(1) },
    ],
    resumeSummary: [
      { id: "su1", userId: "u", text: "Used", ...at(1) },
      { id: "su2", userId: "u", text: "Unused", ...at(1) },
    ],
    resumeSummaryItem: [{ id: "sui1", resumeId: "r1", summaryId: "su1", sortOrder: 0, ...at(1) }],
  };

  const plan = planCompaction(input, { userId: "u", now, prune: true });
  const state = apply(input, plan.ops);
  const ids = (collectionId: string) => [...(state[collectionId]?.keys() ?? [])].sort();

  it("deletes every library row no résumé reaches, with its links", () => {
    expect(ids("resumeExperience")).toEqual(["e1"]);
    expect(ids("resumeExperienceBullet")).toEqual(["b1"]);
    expect(ids("resumeSkillGroup")).toEqual(["g1"]);
    expect(ids("resumeSkillGroupSkill")).toEqual(["l1"]);
    expect(ids("resumeSkill")).toEqual(["s1"]);
    expect(ids("resumeSummary")).toEqual(["su1"]);
  });

  it("leaves the résumé showing exactly what it showed before", () => {
    expect(bulletsShown(state, "r1")).toEqual(["Shipped X"]);
    expect(skillsShown(state, "r1")).toEqual([["React"]]);
    expect(ids("resumeExperienceItem")).toEqual(["ei1"]);
    expect(ids("resumeSummaryItem")).toEqual(["sui1"]);
  });

  it("reports what it removed and sends the full row with each delete", () => {
    expect(plan.pruned).toEqual({
      resumeExperience: 1,
      resumeExperienceBullet: 2,
      resumeSkillGroup: 1,
      resumeSkillGroupSkill: 2,
      resumeSkill: 2,
      resumeSummary: 1,
    });
    const deleted = plan.ops.find((op) => op.type === "delete" && op.id === "su2");
    expect(deleted?.row.text).toBe("Unused");
  });

  it("deletes links before the rows they point at", () => {
    const position = (id: string) => plan.ops.findIndex((op) => op.id === id);
    expect(position("l3")).toBeLessThan(position("g2"));
    expect(position("l3")).toBeLessThan(position("s2"));
  });

  it("prunes nothing without the flag", () => {
    const plain = planCompaction(input, { userId: "u", now });
    expect(plain.pruned).toEqual({});
    expect(plain.ops.filter((op) => op.type === "delete")).toEqual([]);
  });

  it("leaves a collection alone when its résumé join was not loaded", () => {
    const { resumeSummaryItem: _items, ...withoutJoin } = input;
    const partial = planCompaction(withoutJoin, { userId: "u", now, prune: true });
    expect(partial.pruned.resumeSummary).toBeUndefined();
  });
});
