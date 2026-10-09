// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openTestAppDb } from "@/data-access-layer/event-sourced/app-test-db";
import { assembleResumeDetail } from "@/data-access-layer/event-sourced/assemble-resume-detail";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { snapshotEventSourcedResume } from "@/data-access-layer/event-sourced/snapshot-resume";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";
import { SECTION_KEYS, type ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { applyResumeImport, planResumeImport, type ResumeImportPlan } from "./plan-resume-import";
import type { ImportAction, ImportEntry } from "./reconcile";

const ts = { createdAt: 1, updatedAt: 1 };
const lib = { userId: "u1", searchableText: "", embedding: null, embeddingModel: null, ...ts };

let handle: ReturnType<typeof openTestAppDb>;
let db: AppDb;

beforeEach(async () => {
  handle = openTestAppDb();
  db = await handle.ensureDb();
});

afterEach(() => handle.close());

function insertResume(id: string, layout?: Partial<ResumeLayout>) {
  db.collections.resume.insert({
    layout: { ...emptyResumeLayout(), ...layout },
    id,
    userId: "u1",
    name: id,
    fullName: "Ada",
    headline: "",
    description: "",
    jobId: null,
    templateId: "classic",
    searchableText: "",
    embedding: null,
    embeddingModel: null,
    ...ts,
  });
}

function emptyDoc(overrides: Partial<ResumeDocumentV1> = {}): ResumeDocumentV1 {
  return {
    version: 1,
    meta: { templateId: "classic" },
    sectionOrder: [...SECTION_KEYS],
    header: { enabled: true, fullName: "Ada", headline: "", email: "", location: "", links: [] },
    summary: { enabled: true, text: "" },
    experience: { enabled: true, items: [] },
    education: { enabled: true, items: [] },
    projects: { enabled: true, items: [] },
    talks: { enabled: true, items: [] },
    skills: { enabled: true, groups: [] },
    notes: { enabled: false, label: "Notes", text: "" },
    ...overrides,
  };
}

function plan(doc: ResumeDocumentV1, resumeId = "r1") {
  return planResumeImport(db, { resumeId, userId: "u1" }, doc);
}

function entries(importPlan: ResumeImportPlan, section: ImportEntry["section"]) {
  return importPlan.groups.find((group) => group.section === section)?.entries ?? [];
}

function counts() {
  const c = db.collections;
  return {
    experiences: c.resumeExperience.toArray.length,
    bullets: c.resumeExperienceBullet.toArray.length,
    education: c.resumeEducation.toArray.length,
    educationBullets: c.resumeEducationBullet.toArray.length,
    projects: c.resumeProject.toArray.length,
    talks: c.resumeTalk.toArray.length,
    skills: c.resumeSkill.toArray.length,
    skillGroups: c.resumeSkillGroup.toArray.length,
    contacts: c.resumeContact.toArray.length,
    links: c.resumeLink.toArray.length,
    summaries: c.resumeSummary.toArray.length,
    notes: c.resumeNote.toArray.length,
  };
}

const richDoc = emptyDoc({
  header: {
    enabled: true,
    fullName: "Ada Lovelace",
    headline: "Engineer",
    email: "ada@example.com",
    location: "London",
    links: [{ label: "GitHub", url: "https://github.com/ada" }],
  },
  summary: { enabled: true, text: "Builds analytical engines." },
  experience: {
    enabled: true,
    items: [
      {
        company: "Acme",
        role: "Engineer",
        start: "2020-01",
        end: "Present",
        bullets: ["Shipped the engine", "Wrote the notes"],
      },
    ],
  },
  education: {
    enabled: true,
    items: [{ school: "UCL", degree: "BSc", field: "Maths", year: "2019", bullets: ["First"] }],
  },
  projects: {
    enabled: true,
    items: [
      {
        name: "Engine",
        url: "https://github.com/ada/engine",
        description: "A machine",
        tech: ["TypeScript"],
      },
    ],
  },
  talks: {
    enabled: true,
    items: [{ title: "On Engines", event: "RSC", date: "1843", links: [] }],
  },
  skills: {
    enabled: true,
    groups: [
      { name: "Languages", items: ["TypeScript", "Rust"] },
      { name: "Frameworks", items: ["React", "TypeScript"] },
    ],
  },
  notes: { enabled: true, label: "Cover letter", text: "Hello" },
});

describe("planResumeImport / applyResumeImport", () => {
  it("re-importing a résumé's own document adds no rows and only links", async () => {
    insertResume("r1");
    applyResumeImport(db, plan(richDoc));
    const before = counts();

    const detail = assembleResumeDetail("r1", snapshotEventSourcedResume(db, "r1"));
    if (!detail) throw new Error("no résumé");
    const again = plan(resumeDetailToDocument(detail));
    for (const group of again.groups) {
      for (const entry of group.entries)
        expect([entry.key, entry.defaultAction]).toEqual([entry.key, "link"]);
    }
    applyResumeImport(db, again);

    expect(counts()).toEqual(before);
  });

  it("writes every section and one skill row per distinct name", () => {
    insertResume("r1");
    applyResumeImport(db, plan(richDoc));

    expect(counts()).toEqual({
      experiences: 1,
      bullets: 2,
      education: 1,
      educationBullets: 1,
      projects: 1,
      talks: 1,
      skills: 3,
      skillGroups: 2,
      contacts: 2,
      links: 1,
      summaries: 1,
      notes: 1,
    });
    const layout = db.collections.resume.get("r1")?.layout;
    expect(layout?.experiences[0]?.bullets).toHaveLength(2);
    expect(layout?.skillGroups.map((group) => group.skills.length)).toEqual([2, 2]);
    expect(db.collections.resume.get("r1")?.fullName).toBe("Ada Lovelace");
  });

  it("reuses a library skill spelled differently", () => {
    insertResume("r1");
    db.collections.resumeSkill.insert({
      id: "s-node",
      name: "NodeJS",
      level: null,
      sortOrder: 0,
      ...lib,
    });

    const importPlan = plan(
      emptyDoc({ skills: { enabled: true, groups: [{ name: "Backend", items: ["Node.js"] }] } }),
    );
    const [skill] = entries(importPlan, "skills");
    expect(skill?.match).toMatchObject({ id: "s-node", exact: false });
    expect(skill?.defaultAction).toBe("keep");

    applyResumeImport(db, importPlan);
    expect(db.collections.resumeSkill.toArray.map((row) => row.name)).toEqual(["NodeJS"]);
    expect(db.collections.resume.get("r1")?.layout?.skillGroups[0]?.skills).toEqual(["s-node"]);
  });

  it("matches a close experience and updates its dates by default", () => {
    insertResume("r1");
    db.collections.resumeExperience.insert({
      id: "e1",
      company: "Acme Inc.",
      role: "Sr. Software Engineer",
      startDate: "2021-01",
      endDate: "",
      location: "",
      sortOrder: 0,
      ...lib,
    });

    const importPlan = plan(
      emptyDoc({
        experience: {
          enabled: true,
          items: [
            {
              company: "Acme (Remote)",
              role: "Senior Software Engineer",
              start: "Jan 2021",
              end: "2023-05",
              bullets: [],
            },
          ],
        },
      }),
    );
    const [experience] = entries(importPlan, "experiences");
    expect(experience?.match).toMatchObject({ id: "e1", exact: false });
    expect(experience?.changes.map((change) => change.field)).toEqual([
      "company",
      "role",
      "endDate",
    ]);
    expect(experience?.defaultAction).toBe("update");

    applyResumeImport(db, importPlan);
    expect(db.collections.resumeExperience.toArray).toHaveLength(1);
    expect(db.collections.resumeExperience.get("e1")).toMatchObject({
      endDate: "2023-05",
      startDate: "2021-01",
    });
  });

  it("links a repeated item to the one added earlier in the same import", () => {
    insertResume("r1");
    const item = { company: "Acme", role: "Engineer", start: "2020", end: "", bullets: [] };
    const importPlan = plan(emptyDoc({ experience: { enabled: true, items: [item, item] } }));
    const [first, second] = entries(importPlan, "experiences");
    expect(first?.defaultAction).toBe("create");
    expect(second?.match?.earlierEntry).toBe(true);

    applyResumeImport(db, importPlan);
    expect(db.collections.resumeExperience.toArray).toHaveLength(1);
    expect(db.collections.resume.get("r1")?.layout?.experiences).toHaveLength(1);
  });

  it("keeps shared prose by default and rewrites it when chosen", () => {
    db.collections.resumeProject.insert({
      id: "p1",
      name: "Engine",
      url: "https://github.com/ada/engine",
      homepageUrl: "",
      description: "Original wording",
      tech: "[]",
      sortOrder: 0,
      ...lib,
    });
    insertResume("r1");
    insertResume("r2", { projects: ["p1"] });

    const doc = emptyDoc({
      projects: {
        enabled: true,
        items: [
          {
            name: "Engine",
            url: "https://github.com/ada/engine",
            description: "Tailored wording",
            tech: [],
          },
        ],
      },
    });
    const kept = plan(doc);
    const [project] = entries(kept, "projects");
    expect(project).toMatchObject({ usedElsewhere: 1, defaultAction: "keep" });
    expect(project?.actions).toEqual(["update", "keep"]);
    applyResumeImport(db, kept);
    expect(db.collections.resumeProject.get("p1")?.description).toBe("Original wording");

    const updated = plan(doc);
    const choices = new Map<string, ImportAction>([[`projects:0`, "update"]]);
    applyResumeImport(db, updated, choices);
    expect(db.collections.resumeProject.get("p1")?.description).toBe("Tailored wording");
    expect(db.collections.resumeProject.toArray).toHaveLength(1);
  });

  it("adds only new education bullets", () => {
    insertResume("r1");
    const doc = emptyDoc({
      education: {
        enabled: true,
        items: [{ school: "UCL", degree: "BSc", year: "2019", bullets: ["First"] }],
      },
    });
    applyResumeImport(db, plan(doc));
    const next = structuredClone(doc);
    next.education.items[0]!.bullets = ["First", "Prize"];
    applyResumeImport(db, plan(next));

    expect(db.collections.resumeEducation.toArray).toHaveLength(1);
    expect(db.collections.resumeEducationBullet.toArray.map((row) => row.text).sort()).toEqual([
      "First",
      "Prize",
    ]);
  });
});
