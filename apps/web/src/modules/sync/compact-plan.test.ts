import { describe, expect, it } from "vitest";
import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";
import { planCompaction, type CompactionOp } from "./compact-plan";

const now = new Date(10_000);
const at = (ms: number) => ({ createdAt: new Date(ms), updatedAt: new Date(ms) });

function layout(patch: Partial<ResumeLayout>): ResumeLayout {
  return { ...emptyResumeLayout(), ...patch };
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

function layoutOf(state: ReturnType<typeof apply>, resumeId: string): ResumeLayout {
  const value = state.resume?.get(resumeId)?.layout;
  if (value == null || typeof value !== "object") throw new Error(`No layout on ${resumeId}`);
  return layout(value);
}

function bulletsShown(state: ReturnType<typeof apply>, resumeId: string) {
  return layoutOf(state, resumeId).experiences.map((entry) =>
    entry.bullets.map((id) => state.resumeExperienceBullet?.get(id)?.text),
  );
}

function skillsShown(state: ReturnType<typeof apply>, resumeId: string) {
  return layoutOf(state, resumeId).skillGroups.map((entry) =>
    entry.skills.map((id) => state.resumeSkill?.get(id)?.name),
  );
}

describe("planCompaction", () => {
  const input = {
    resume: [
      {
        id: "r1",
        userId: "u",
        layout: layout({
          experiences: [{ id: "e1", bullets: ["b1", "b2"] }],
          skillGroups: [{ id: "g1", skills: ["s1", "s2"] }],
        }),
        ...at(1),
      },
      {
        id: "r2",
        userId: "u",
        layout: layout({
          experiences: [{ id: "e2", bullets: ["b3"] }],
          skillGroups: [
            { id: "g2", skills: ["s3"] },
            { id: "g1", skills: ["s4"] },
          ],
        }),
        ...at(1),
      },
    ],
    resumeExperience: [
      { id: "e1", userId: "u", company: "Acme", role: "Dev", startDate: "2020", ...at(1) },
      { id: "e2", userId: "u", company: " acme ", role: "dev", startDate: "2020", ...at(2) },
    ],
    resumeExperienceBullet: [
      { id: "b1", experienceId: "e1", text: "Shipped X", sortOrder: 0, ...at(1) },
      { id: "b2", experienceId: "e1", text: "Led Y", sortOrder: 1, ...at(1) },
      { id: "b3", experienceId: "e2", text: "Shipped X", sortOrder: 0, ...at(1) },
    ],
    resumeSkillGroup: [
      { id: "g1", userId: "u", name: "Frontend", ...at(1) },
      { id: "g2", userId: "u", name: "frontend ", ...at(2) },
    ],
    resumeSkill: [
      { id: "s1", userId: "u", name: "React", ...at(1) },
      { id: "s2", userId: "u", name: "CSS", ...at(1) },
      { id: "s3", userId: "u", name: "react", ...at(1) },
      { id: "s4", userId: "u", name: "Vue", ...at(1) },
    ],
  };

  const plan = planCompaction(input, { now });
  const state = apply(input, plan.ops);

  it("keeps one row per experience, bullet text, skill name and group name", () => {
    expect(state.resumeExperience?.size).toBe(1);
    expect(state.resumeExperienceBullet?.size).toBe(2);
    expect(state.resumeSkill?.size).toBe(3);
    expect(state.resumeSkillGroup?.size).toBe(1);
  });

  it("leaves every résumé showing what it showed before", () => {
    expect(bulletsShown(state, "r1")).toEqual([["Shipped X", "Led Y"]]);
    expect(bulletsShown(state, "r2")).toEqual([["Shipped X"]]);
    expect(skillsShown(state, "r1")).toEqual([["React", "CSS"]]);
  });

  it("folds two groups with one name on the same résumé into the union of their skills", () => {
    expect(skillsShown(state, "r2")).toEqual([["React", "Vue"]]);
  });

  it("orders events so children are repointed before their old parent goes", () => {
    const index = (type: string, collectionId: string, id: string) =>
      plan.ops.findIndex(
        (op) => op.type === type && op.collectionId === collectionId && op.id === id,
      );
    const loser = state.resumeExperience?.has("e1") ? "e2" : "e1";
    const repoint = plan.ops.findIndex(
      (op) => op.type === "update" && op.collectionId === "resume",
    );
    expect(repoint).toBeGreaterThanOrEqual(0);
    expect(repoint).toBeLessThan(index("delete", "resumeExperience", loser));
  });

  it("does nothing once the data is already unique", () => {
    const settled = Object.fromEntries(
      Object.entries(state).map(([id, rows]) => [id, [...rows.values()]]),
    );
    expect(planCompaction(settled, { now }).ops).toEqual([]);
  });
});

describe("planCompaction with prune", () => {
  const input = {
    resume: [
      {
        id: "r1",
        userId: "u",
        layout: layout({
          experiences: [{ id: "e1", bullets: ["b1"] }],
          skillGroups: [{ id: "g1", skills: ["s1"] }],
          summaries: ["su1"],
        }),
        ...at(1),
      },
    ],
    resumeExperience: [
      { id: "e1", userId: "u", company: "Acme", role: "Dev", startDate: "2020", ...at(1) },
      { id: "e2", userId: "u", company: "Old", role: "Dev", startDate: "2010", ...at(1) },
    ],
    resumeExperienceBullet: [
      { id: "b1", experienceId: "e1", text: "Shipped X", sortOrder: 0, ...at(1) },
      { id: "b2", experienceId: "e1", text: "Unused draft", sortOrder: 1, ...at(1) },
      { id: "b3", experienceId: "e2", text: "Old work", sortOrder: 0, ...at(1) },
    ],
    resumeSkillGroup: [
      { id: "g1", userId: "u", name: "Frontend", ...at(1) },
      { id: "g2", userId: "u", name: "Backend", ...at(1) },
    ],
    resumeSkill: [
      { id: "s1", userId: "u", name: "React", ...at(1) },
      { id: "s2", userId: "u", name: "Unpicked", ...at(1) },
    ],
    resumeSummary: [
      { id: "su1", userId: "u", text: "Used", ...at(1) },
      { id: "su2", userId: "u", text: "Unused", ...at(1) },
    ],
  };

  const plan = planCompaction(input, { now, prune: true });
  const state = apply(input, plan.ops);
  const ids = (collectionId: string) => [...(state[collectionId]?.keys() ?? [])].sort();

  it("deletes every library row no layout reaches, with its owned bullets", () => {
    expect(ids("resumeExperience")).toEqual(["e1"]);
    expect(ids("resumeExperienceBullet")).toEqual(["b1"]);
    expect(ids("resumeSkillGroup")).toEqual(["g1"]);
    expect(ids("resumeSkill")).toEqual(["s1"]);
    expect(ids("resumeSummary")).toEqual(["su1"]);
  });

  it("leaves the résumé showing exactly what it showed before", () => {
    expect(bulletsShown(state, "r1")).toEqual([["Shipped X"]]);
    expect(skillsShown(state, "r1")).toEqual([["React"]]);
  });

  it("reports what it removed and sends the full row with each delete", () => {
    expect(plan.pruned).toEqual({
      resumeExperience: 1,
      resumeExperienceBullet: 2,
      resumeSkillGroup: 1,
      resumeSkill: 1,
      resumeSummary: 1,
    });
    const deleted = plan.ops.find((op) => op.type === "delete" && op.id === "su2");
    expect(deleted?.row.text).toBe("Unused");
  });

  it("deletes bullets before the experience that owns them", () => {
    const position = (id: string) => plan.ops.findIndex((op) => op.id === id);
    expect(position("b3")).toBeLessThan(position("e2"));
  });

  it("prunes nothing without the flag", () => {
    const plain = planCompaction(input, { now });
    expect(plain.pruned).toEqual({});
    expect(plain.ops.filter((op) => op.type === "delete")).toEqual([]);
  });

  it("prunes nothing while any résumé has no layout", () => {
    const unmigrated = {
      ...input,
      resume: [...input.resume, { id: "r2", userId: "u", layout: null, ...at(1) }],
    };
    expect(planCompaction(unmigrated, { now, prune: true }).pruned).toEqual({});
  });
});
