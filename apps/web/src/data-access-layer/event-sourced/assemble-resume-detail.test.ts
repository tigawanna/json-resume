import { describe, expect, it } from "vitest";
import { emptyResumeLayout } from "@/features/resume/resume-layout";
import { assembleResumeDetail, type EventSourcedResumeSnapshots } from "./assemble-resume-detail";
import type { Resume } from "./schemas";

const ts = { createdAt: 1, updatedAt: 1 };
const searchable = { searchableText: "" };

const baseResume: Resume = {
  id: "r1",
  userId: "u1",
  name: "R",
  fullName: "",
  headline: "",
  description: "",
  templateId: "classic",
  ...searchable,
  ...ts,
};

function snapshots(overrides: Partial<EventSourcedResumeSnapshots>): EventSourcedResumeSnapshots {
  return {
    resume: baseResume,
    contacts: [],
    links: [],
    summaries: [],
    notes: [],
    experiences: [],
    experienceBullets: [],
    education: [],
    educationBullets: [],
    projects: [],
    skillGroups: [],
    skills: [],
    talks: [],
    certifications: [],
    volunteers: [],
    languages: [],
    jobs: [],
    ...overrides,
  };
}

function experience(id: string) {
  return {
    id,
    company: id,
    role: "",
    startDate: "",
    endDate: "",
    location: "",
    sortOrder: 0,
    ...searchable,
    ...ts,
  };
}

function bullet(id: string, experienceId: string, sortOrder: number) {
  return { id, experienceId, text: id, sortOrder, ...searchable, ...ts };
}

function skill(id: string, sortOrder: number) {
  return { id, name: id, sortOrder, ...searchable, ...ts };
}

const library = snapshots({
  experiences: [experience("a"), experience("b")],
  experienceBullets: [bullet("a1", "a", 0), bullet("a2", "a", 1), bullet("b1", "b", 0)],
  skillGroups: [{ id: "g", name: "Langs", sortOrder: 0, ...searchable, ...ts }],
  skills: [skill("ts", 0), skill("go", 1)],
});

describe("assembleResumeDetail", () => {
  it("renders the stored layout in order, skipping ids whose rows are gone", () => {
    const detail = assembleResumeDetail("r1", {
      ...library,
      resume: {
        ...baseResume,
        layout: {
          ...emptyResumeLayout(),
          sections: [{ key: "skills", title: "Stack", enabled: true }],
          experiences: [
            { id: "b", bullets: [] },
            { id: "gone", bullets: [] },
            { id: "a", bullets: ["a2", "gone"] },
          ],
          skillGroups: [{ id: "g", skills: ["go", "ts"] }],
        },
      },
    });
    expect(detail?.sections).toEqual([
      {
        id: "r1:skills",
        resumeId: "r1",
        key: "skills",
        title: "Stack",
        enabled: true,
        sortOrder: 0,
      },
    ]);
    expect(detail?.experiences.map((row) => [row.id, row.bullets.map((b) => b.id)])).toEqual([
      ["b", []],
      ["a", ["a2"]],
    ]);
    expect(detail?.skillGroups[0]?.skills.map((row) => [row.id, row.sortOrder])).toEqual([
      ["go", 0],
      ["ts", 1],
    ]);
  });

  it("treats a résumé without a layout as showing nothing under the default sections", () => {
    const detail = assembleResumeDetail("r1", library);
    expect(detail?.sections.map((section) => section.key)).toEqual(
      emptyResumeLayout().sections.map((section) => section.key),
    );
    expect(detail?.experiences).toEqual([]);
    expect(detail?.skillGroups).toEqual([]);
  });

  it("reads the target job posting from the linked job", () => {
    const detail = assembleResumeDetail("r1", {
      ...library,
      resume: { ...baseResume, jobId: "j1" },
      jobs: [
        {
          id: "j1",
          userId: "u1",
          company: "",
          title: "Engineer",
          url: "",
          location: "",
          description: "Build things",
          notes: "",
          status: "saved",
          ...searchable,
          ...ts,
        },
      ],
    });
    expect(detail?.jobId).toBe("j1");
    expect(detail?.jobDescription).toBe("Build things");
    expect(detail?.job).toMatchObject({ id: "j1", title: "Engineer", company: "" });
  });

  it("falls back to a legacy pasted job description when no job is linked", () => {
    const legacyRow = { ...baseResume, jobDescription: "Old posting" };
    const detail = assembleResumeDetail("r1", { ...library, resume: legacyRow });
    expect(detail?.job).toBeNull();
    expect(detail?.jobDescription).toBe("Old posting");
  });
});
