// @vitest-environment node
import { describe, expect, it } from "vitest";
import { useLocalToolDb } from "./local-tool-fixtures";
import {
  attachLocalLibraryItems,
  rankLocalLibraryForJob,
  searchLocalLibrary,
} from "./local-library-tools";
import { getLocalResume } from "./local-resume-tools";

const fixture = useLocalToolDb();
const { context, insertExperience, insertJob, insertResume } = fixture;

function seed() {
  insertExperience("exp1", "Initech", [
    { id: "b1", text: "Shipped billing in Go" },
    { id: "b2", text: "Cut AWS costs" },
  ]);
  insertExperience("exp2", "Globex", [
    { id: "b3", text: "Built React dashboards" },
    { id: "b4", text: "Led Kubernetes migration" },
  ]);
  insertJob("platform", {
    company: "Acme",
    title: "Platform Engineer",
    description: "Kubernetes and Go on AWS.",
  });
  insertResume("cv", 1, {
    name: "CV",
    layout: { experiences: [{ id: "exp1", bullets: ["b1"] }] },
  });
}

describe("search_library", () => {
  it("finds rows across résumés and flags what the target résumé shows", async () => {
    seed();

    const result = await searchLocalLibrary(context("cv"), {
      section: "experience_bullet",
      keyword: "kubernetes",
    });

    expect(result.items).toEqual([
      {
        id: "b4",
        title: "Led Kubernetes migration",
        detail: "Engineer at Globex",
        experienceId: "exp2",
        onResume: false,
      },
    ]);
    expect(result).toMatchObject({ resumeId: "cv", total: 1, nextOffset: null });
  });

  it("requires every word to match some field", async () => {
    seed();

    const result = await searchLocalLibrary(context("cv"), {
      section: "experience",
      keyword: "engineer globex",
    });

    expect(result.items.map((item) => item.id)).toEqual(["exp2"]);
  });

  it("pages, and can skip what the résumé already shows", async () => {
    seed();

    const page = await searchLocalLibrary(context("cv"), {
      section: "experience_bullet",
      limit: 2,
    });
    expect(page).toMatchObject({ total: 4, nextOffset: 2 });
    expect(page.items).toHaveLength(2);

    const missing = await searchLocalLibrary(context("cv"), {
      section: "experience_bullet",
      notOnResume: true,
    });
    expect(missing.total).toBe(3);
    expect(missing.items.map((item) => item.id)).not.toContain("b1");
  });
});

describe("attach_library_items", () => {
  it("adds an experience with all its library bullets", async () => {
    seed();
    const ctx = context("cv");

    const result = await attachLocalLibraryItems(ctx, { section: "experience", ids: ["exp2"] });

    expect(result).toEqual({
      resumeId: "cv",
      section: "experience",
      attachedIds: ["exp2"],
      alreadyOnResume: [],
    });
    const experience = getLocalResume(ctx, { sections: ["experience"] }).resume.experience;
    expect(experience?.map((item) => item.id)).toEqual(["exp1", "exp2"]);
    expect(experience?.[1]?.bullets.map((bullet) => bullet.id)).toEqual(["b3", "b4"]);
  });

  it("adds a bullet to its experience and skips ones already shown", async () => {
    seed();
    const ctx = context("cv");

    const result = await attachLocalLibraryItems(ctx, {
      section: "experience_bullet",
      ids: ["b2", "b1"],
    });

    expect(result).toMatchObject({ attachedIds: ["b2"], alreadyOnResume: ["b1"] });
    const experience = getLocalResume(ctx, { sections: ["experience"] }).resume.experience;
    expect(experience?.[0]?.bullets.map((bullet) => bullet.id)).toEqual(["b1", "b2"]);
  });

  it("rejects ids that are not in that library section", async () => {
    seed();

    await expect(
      attachLocalLibraryItems(context("cv"), { section: "projects", ids: ["exp1"] }),
    ).rejects.toThrow("search_library");
  });
});

describe("rank_library_for_job", () => {
  it("ranks rows the résumé does not show by job keywords", async () => {
    seed();

    const result = await rankLocalLibraryForJob(context("cv"), {
      jobId: "platform",
      sections: ["experience_bullet"],
    });

    const ids = result.results.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(["b2", "b4"]));
    expect(ids).not.toContain("b1");
    expect(result.results.find((item) => item.id === "b4")?.matchedTerms).toContain("kubernetes");
  });

  it("includes rows on the résumé when asked", async () => {
    seed();

    const result = await rankLocalLibraryForJob(context("cv"), {
      jobText: "Go billing",
      sections: ["experience_bullet"],
      includeOnResume: true,
    });

    expect(result.results[0]).toMatchObject({
      id: "b1",
      onResume: true,
      section: "experience_bullet",
    });
  });
});
