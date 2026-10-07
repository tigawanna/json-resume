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

  it("does nothing once the data is already unique", () => {
    const settled = Object.fromEntries(
      Object.entries(state).map(([id, rows]) => [id, [...rows.values()]]),
    );
    expect(planCompaction(settled, { userId: "u", now }).ops).toEqual([]);
  });
});
