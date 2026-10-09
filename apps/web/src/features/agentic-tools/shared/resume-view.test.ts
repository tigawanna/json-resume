import { describe, expect, it } from "vitest";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { resumeViewSchema } from "../resume-tool-schemas";
import { parseTech, resumeView } from "./resume-view";

function detail(overrides: Partial<ResumeDetailDTO> = {}): ResumeDetailDTO {
  return {
    id: "r1",
    userId: "u1",
    name: "CV",
    fullName: "Ada",
    headline: "Engineer",
    description: "",
    jobDescription: "",
    jobId: null,
    job: null,
    templateId: "classic",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    sections: [
      {
        id: "r1:skills",
        resumeId: "r1",
        key: "skills",
        title: "Skills",
        enabled: true,
        sortOrder: 0,
      },
      {
        id: "r1:talks",
        resumeId: "r1",
        key: "talks",
        title: "Talks",
        enabled: false,
        sortOrder: 1,
      },
      { id: "r1:x", resumeId: "r1", key: "unknown", title: "?", enabled: false, sortOrder: 2 },
    ],
    contacts: [],
    links: [],
    summaries: [],
    notes: [],
    experiences: [],
    education: [],
    projects: [
      {
        id: "p1",
        resumeId: "r1",
        name: "Tool",
        url: "",
        homepageUrl: "",
        description: "",
        tech: '["Go","SQL"]',
        sortOrder: 0,
      },
    ],
    skillGroups: [
      {
        id: "g1",
        resumeId: "r1",
        name: "Languages",
        sortOrder: 0,
        skills: [
          { id: "k2", groupId: "g1", name: "Rust", level: null, sortOrder: 1 },
          { id: "k1", groupId: "g1", name: "Go", level: null, sortOrder: 0 },
        ],
      },
    ],
    talks: [],
    certifications: [],
    volunteers: [],
    languages: [],
    ...overrides,
  };
}

describe("resumeView", () => {
  it("keeps the stored section order, appends missing sections, and lists hidden ones", () => {
    const view = resumeView(detail());

    expect(view.sectionOrder.slice(0, 2)).toEqual(["skills", "talks"]);
    expect(view.sectionOrder).toHaveLength(8);
    expect(view.hiddenSections).toEqual(["talks"]);
  });

  it("orders items by sortOrder and parses project tech", () => {
    const view = resumeView(detail());

    expect(view.skills).toEqual([
      {
        id: "g1",
        name: "Languages",
        skills: [
          { id: "k1", name: "Go" },
          { id: "k2", name: "Rust" },
        ],
      },
    ]);
    expect(view.projects?.[0]?.tech).toEqual(["Go", "SQL"]);
  });

  it("validates against the tool output schema for every section filter", () => {
    expect(resumeViewSchema.safeParse(resumeView(detail())).success).toBe(true);
    expect(resumeViewSchema.safeParse(resumeView(detail(), ["skills"])).success).toBe(true);
  });
});

describe("parseTech", () => {
  it("reads JSON arrays and falls back to comma-separated text", () => {
    expect(parseTech('["Go", 1, "SQL"]')).toEqual(["Go", "SQL"]);
    expect(parseTech("Go, SQL")).toEqual(["Go", "SQL"]);
    expect(parseTech("")).toEqual([]);
  });
});
