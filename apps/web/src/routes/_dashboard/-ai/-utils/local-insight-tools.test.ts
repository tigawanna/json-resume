// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { JobStatus } from "@/data-access-layer/event-sourced/schemas";
import { useLocalToolDb } from "./local-tool-fixtures";
import {
  getLocalApplicationStats,
  getLocalProfileOverview,
  parseResumeMonth,
  yearsCovered,
} from "./local-insight-tools";

const fixture = useLocalToolDb();
const { context, insertExperience, insertResume } = fixture;

const NOW = new Date(2026, 9, 12).getTime();
const embeddable = { searchableText: "", embedding: null, embeddingModel: null };

function addJob(
  id: string,
  status: JobStatus,
  dates: { createdAt: Date; appliedAt?: Date; updatedAt?: Date },
) {
  fixture.db().collections.job.insert({
    id,
    userId: "u1",
    company: `Company ${id}`,
    title: "Engineer",
    description: "A posting.",
    url: "",
    location: "",
    payRate: "",
    hourlyMinCents: null,
    hourlyMaxCents: null,
    payBasis: null,
    status,
    notes: "",
    appliedAt: dates.appliedAt?.getTime() ?? null,
    ...embeddable,
    createdAt: dates.createdAt.getTime(),
    updatedAt: (dates.updatedAt ?? dates.createdAt).getTime(),
  });
}

describe("get_application_stats", () => {
  it("counts statuses, sent applications, rates and months", () => {
    addJob("a", "saved", { createdAt: new Date(2026, 9, 1) });
    addJob("b", "applied", { createdAt: new Date(2026, 8, 2), appliedAt: new Date(2026, 8, 3) });
    addJob("c", "interviewing", {
      createdAt: new Date(2026, 7, 5),
      appliedAt: new Date(2026, 7, 6),
      updatedAt: new Date(2026, 9, 10),
    });
    addJob("d", "rejected", { createdAt: new Date(2026, 8, 20) });
    addJob("e", "offer", { createdAt: new Date(2025, 0, 1), appliedAt: new Date(2025, 0, 2) });
    insertResume("cv", 1, { jobId: "c" });

    const stats = getLocalApplicationStats(context(), { months: 3 }, NOW);

    expect(stats.today).toBe("2026-10-12");
    expect(stats.totalJobs).toBe(5);
    expect(stats.byStatus).toEqual({
      saved: 1,
      applied: 1,
      interviewing: 1,
      offer: 1,
      rejected: 1,
      archived: 0,
    });
    expect(stats.applied).toBe(4);
    expect(stats.interviewRate).toBe(0.5);
    expect(stats.offerRate).toBe(0.25);
    expect(stats.perMonth).toEqual([
      { month: "2026-08", applied: 1, saved: 1 },
      { month: "2026-09", applied: 1, saved: 2 },
      { month: "2026-10", applied: 0, saved: 1 },
    ]);
    expect(stats.jobsWithoutResume).toBe(4);
    expect(stats.recent[0]?.jobId).toBe("c");
  });

  it("reports zero rates with no applications", () => {
    const stats = getLocalApplicationStats(context(), {}, NOW);

    expect(stats).toMatchObject({ totalJobs: 0, applied: 0, interviewRate: 0, offerRate: 0 });
    expect(stats.perMonth).toHaveLength(6);
  });
});

describe("résumé dates", () => {
  it("reads years, numeric months and month names", () => {
    expect(parseResumeMonth("2020")).toBe(2020 * 12);
    expect(parseResumeMonth("2020-03")).toBe(2020 * 12 + 2);
    expect(parseResumeMonth("03/2020")).toBe(2020 * 12 + 2);
    expect(parseResumeMonth("Mar 2020")).toBe(2020 * 12 + 2);
    expect(parseResumeMonth("soon")).toBeNull();
  });

  it("merges overlapping ranges and counts current roles up to today", () => {
    expect(
      yearsCovered(
        [
          { startDate: "2018-01", endDate: "2020-12" },
          { startDate: "2020-06", endDate: "2021-12" },
          { startDate: "2024-01", endDate: "Present" },
        ],
        NOW,
      ),
    ).toBe(6.8);
    expect(yearsCovered([{ startDate: "", endDate: "" }], NOW)).toBeNull();
  });
});

describe("get_profile_overview", () => {
  it("summarizes counts, roles, headlines, skills and technologies", () => {
    const { collections } = fixture.db();
    const lib = { userId: "u1", ...embeddable, createdAt: 1, updatedAt: 1 };
    insertExperience("exp1", "Initech", []);
    collections.resumeSkill.insert({ id: "s-go", name: "Go", sortOrder: 0, ...lib });
    collections.resumeSkill.insert({ id: "s-sql", name: "SQL", sortOrder: 1, ...lib });
    collections.resumeProject.insert({
      id: "p1",
      name: "Billing",
      url: "",
      homepageUrl: "",
      description: "",
      tech: '["Go","Postgres"]',
      sortOrder: 0,
      ...lib,
    });
    collections.resumeProject.insert({
      id: "p2",
      name: "Broken",
      url: "",
      homepageUrl: "",
      description: "",
      tech: "not json",
      sortOrder: 1,
      ...lib,
    });
    insertResume("cv", 2, {
      headline: "Go engineer",
      layout: { skillGroups: [{ id: "g", skills: ["s-go", "s-sql"] }] },
    });
    insertResume("cv2", 1, {
      headline: "Go engineer",
      layout: { skillGroups: [{ id: "g", skills: ["s-go"] }] },
    });

    const overview = getLocalProfileOverview(context(), {}, NOW);

    expect(overview.counts).toMatchObject({ resumes: 2, experiences: 1, projects: 2, skills: 2 });
    expect(overview.experiences).toEqual([
      { company: "Initech", role: "Engineer", startDate: "2020", endDate: "" },
    ]);
    expect(overview.yearsOfExperience).toBe(6.8);
    expect(overview.headlines).toEqual(["Go engineer"]);
    expect(overview.topSkills).toEqual([
      { name: "Go", count: 2 },
      { name: "SQL", count: 1 },
    ]);
    expect(overview.topTechnologies).toEqual([
      { name: "Go", count: 1 },
      { name: "Postgres", count: 1 },
    ]);
  });
});
