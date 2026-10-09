// @vitest-environment node
import { describe, expect, it } from "vitest";
import { useLocalToolDb } from "./local-tool-fixtures";
import { createDefaultResume } from "@/features/resume/resume-schema";
import {
  removeLocalFromResume,
  replaceLocalResumeDocument,
  setLocalExperienceBullets,
  setLocalSkills,
  setLocalSummary,
  updateLocalResumeDetails,
  upsertLocalEducation,
  upsertLocalExperience,
  upsertLocalProject,
  upsertLocalTalk,
} from "./local-resume-edit-tools";
import { getLocalResume } from "./local-resume-tools";

const fixture = useLocalToolDb();
const { context, insertResume, insertSummary, insertExperience } = fixture;

function seed() {
  insertSummary("s1", "Old summary");
  insertExperience("exp1", "Initech", [
    { id: "b1", text: "Shipped billing" },
    { id: "b2", text: "Cut costs" },
  ]);
  insertResume("cv", 1, {
    name: "CV",
    headline: "Engineer",
    layout: { summaries: ["s1"], experiences: [{ id: "exp1", bullets: ["b1", "b2"] }] },
  });
  insertResume("other", 2, { name: "Other" });
}

describe("update_resume_details", () => {
  it("changes only the fields passed", async () => {
    seed();

    const result = await updateLocalResumeDetails(context("cv"), {
      headline: "Staff engineer",
      templateId: "modern",
    });

    expect(result).toEqual({
      resumeId: "cv",
      name: "CV",
      fullName: "Ada",
      headline: "Staff engineer",
      description: "",
      templateId: "modern",
    });
    expect(fixture.db().collections.resume.get("cv")?.headline).toBe("Staff engineer");
  });
});

describe("set_summary", () => {
  it("replaces the summary on the active résumé and returns the stored row", async () => {
    seed();

    const result = await setLocalSummary(context("cv"), { text: "New summary" });

    expect(result.resumeId).toBe("cv");
    expect(result.summary?.text).toBe("New summary");
    expect(getLocalResume(context("cv"), { sections: ["summary"] }).resume.summary).toEqual([
      result.summary,
    ]);
  });

  it("targets another résumé when resumeId is given and clears on empty text", async () => {
    seed();

    await setLocalSummary(context("other"), { resumeId: "cv", text: "" });

    expect(getLocalResume(context("cv"), { sections: ["summary"] }).resume.summary).toEqual([]);
  });
});

describe("set_experience_bullets", () => {
  it("reuses unchanged wording and drops omitted bullets from this résumé only", async () => {
    seed();

    const result = await setLocalExperienceBullets(context("cv"), {
      experienceId: "exp1",
      bullets: ["Cut costs", "Led migration"],
    });

    expect(result.bullets[0]).toEqual({ id: "b2", text: "Cut costs" });
    expect(result.bullets[1]?.text).toBe("Led migration");
    expect(result.bullets).toHaveLength(2);
    expect(fixture.db().collections.resumeExperienceBullet.get("b1")).toBeDefined();
  });

  it("rejects an experience that is not on the résumé", async () => {
    seed();

    await expect(
      setLocalExperienceBullets(context("other"), { experienceId: "exp1", bullets: ["x"] }),
    ).rejects.toThrow(/get_resume/);
  });
});

describe("set_skills", () => {
  it("replaces skill groups and returns their ids", async () => {
    seed();

    const result = await setLocalSkills(context("cv"), {
      groups: [
        { name: "Languages", skills: ["Go", "TypeScript"] },
        { name: "Cloud", skills: ["AWS"] },
      ],
    });

    expect(result.skills.map((group) => group.name)).toEqual(["Languages", "Cloud"]);
    expect(result.skills[0]?.skills.map((skill) => skill.name)).toEqual(["Go", "TypeScript"]);
    expect(result.skills.every((group) => group.id.length > 0)).toBe(true);
  });
});

describe("remove_from_resume", () => {
  it("takes the item off the layout but keeps the library row", () => {
    seed();

    const result = removeLocalFromResume(context("cv"), {
      section: "experience",
      itemId: "exp1",
    });

    expect(result.removed).toBe(true);
    expect(getLocalResume(context("cv"), {}).resume.experience).toEqual([]);
    expect(fixture.db().collections.resumeExperience.get("exp1")).toBeDefined();
  });

  it("reports false for an item that is not on the résumé", () => {
    seed();

    expect(
      removeLocalFromResume(context("other"), { section: "summary", itemId: "s1" }).removed,
    ).toBe(false);
  });
});

describe("upsert_experience", () => {
  it("creates an experience with bullets on the résumé", async () => {
    seed();

    const result = await upsertLocalExperience(context("other"), {
      company: "Globex",
      role: "Lead",
      startDate: "2023",
      bullets: ["Built the platform"],
    });

    expect(result.created).toBe(true);
    expect(result.experience).toMatchObject({ company: "Globex", role: "Lead", startDate: "2023" });
    expect(result.experience.bullets.map((bullet) => bullet.text)).toEqual(["Built the platform"]);
    expect(getLocalResume(context("other"), {}).resume.experience).toEqual([result.experience]);
  });

  it("reuses an identical library item instead of inserting a duplicate", async () => {
    seed();

    const result = await upsertLocalExperience(context("other"), {
      company: "Initech",
      role: "Engineer",
      startDate: "2020",
    });

    expect(result).toMatchObject({ created: false, experience: { id: "exp1" } });
  });

  it("edits the shared library item by id and adds it to a résumé that lacked it", async () => {
    seed();

    const result = await upsertLocalExperience(context("other"), { id: "exp1", role: "Staff" });

    expect(result.created).toBe(false);
    expect(result.experience).toMatchObject({ id: "exp1", company: "Initech", role: "Staff" });
    expect(getLocalResume(context("cv"), {}).resume.experience?.[0]?.role).toBe("Staff");
  });

  it("needs company and role to create, and a known id to edit", async () => {
    seed();

    await expect(upsertLocalExperience(context("cv"), { company: "Acme" })).rejects.toThrow(/role/);
    await expect(upsertLocalExperience(context("cv"), { id: "nope" })).rejects.toThrow(
      /get_resume/,
    );
  });
});

describe("upsert_project", () => {
  it("creates a project and keeps unspecified fields when editing", async () => {
    seed();

    const created = await upsertLocalProject(context("cv"), {
      name: "Atlas",
      tech: ["Go", "Postgres"],
      url: "https://example.com/atlas",
    });
    const edited = await upsertLocalProject(context("cv"), {
      id: created.project.id,
      description: "Search engine",
    });

    expect(created.created).toBe(true);
    expect(edited.project).toMatchObject({
      name: "Atlas",
      description: "Search engine",
      tech: ["Go", "Postgres"],
      url: "https://example.com/atlas",
    });
  });
});

describe("upsert_education", () => {
  it("creates an education entry and requires a school", async () => {
    seed();

    const result = await upsertLocalEducation(context("cv"), {
      school: "MIT",
      degree: "BSc",
      field: "CS",
    });

    expect(result.education).toMatchObject({ school: "MIT", degree: "BSc", field: "CS" });
    await expect(upsertLocalEducation(context("cv"), { degree: "MSc" })).rejects.toThrow(/school/);
  });
});

describe("upsert_talk", () => {
  it("stores talk links and returns them parsed", async () => {
    seed();

    const result = await upsertLocalTalk(context("cv"), {
      title: "Local-first apps",
      event: "JSConf",
      links: [{ label: "Slides", url: "https://example.com/slides" }],
    });

    expect(result.talk.links).toEqual([{ label: "Slides", url: "https://example.com/slides" }]);
    expect(getLocalResume(context("cv"), { sections: ["talks"] }).resume.talks).toEqual([
      result.talk,
    ]);
  });
});

describe("replace_resume_document", () => {
  it("rewrites the target résumé from a document", async () => {
    seed();
    const document = createDefaultResume();

    const result = await replaceLocalResumeDocument(context("other"), {
      resumeId: "cv",
      document: { ...document, summary: { enabled: true, text: "Rewritten summary" } },
    });

    expect(result.resumeId).toBe("cv");
    const resume = getLocalResume(context("cv"), {}).resume;
    expect(resume.summary?.map((summary) => summary.text)).toEqual(["Rewritten summary"]);
    expect(resume.experience?.length).toBe(document.experience.items.length);
  });
});
