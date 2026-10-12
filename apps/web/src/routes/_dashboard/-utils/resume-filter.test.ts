import type { Resume } from "@/data-access-layer/event-sourced/schemas";
import { emptyResumeLayout } from "@/features/resume/resume-layout";
import { describe, expect, it } from "vitest";
import { resumeLabel, resumesJobIds, resumesLibraryIds } from "./resume-filter";

function resume(overrides: Partial<Resume>): Resume {
  return {
    id: "r",
    userId: "u",
    name: "",
    fullName: "",
    headline: "",
    description: "",
    templateId: "t",
    searchableText: "",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("resumesLibraryIds", () => {
  it("unions one section across résumés without duplicates", () => {
    const a = resume({
      id: "a",
      layout: {
        ...emptyResumeLayout(),
        experiences: [
          { id: "e1", bullets: ["b1"] },
          { id: "e2", bullets: [] },
        ],
        education: ["ed1"],
      },
    });
    const b = resume({
      id: "b",
      layout: { ...emptyResumeLayout(), experiences: [{ id: "e2", bullets: [] }] },
    });
    const noLayout = resume({ id: "c", layout: null });

    expect(resumesLibraryIds([a, b, noLayout], "experiences")).toEqual(["e1", "e2"]);
    expect(resumesLibraryIds([a, b, noLayout], "education")).toEqual(["ed1"]);
    expect(resumesLibraryIds([b], "talks")).toEqual([]);
  });
});

describe("resumesJobIds", () => {
  it("skips résumés without a job and de-duplicates", () => {
    expect(
      resumesJobIds([
        resume({ id: "a", jobId: "j1" }),
        resume({ id: "b", jobId: "j1" }),
        resume({ id: "c", jobId: null }),
        resume({ id: "d" }),
      ]),
    ).toEqual(["j1"]);
  });
});

describe("resumeLabel", () => {
  it("falls back from name to full name to a placeholder", () => {
    expect(resumeLabel({ name: " Celar ", fullName: "Dennis" })).toBe("Celar");
    expect(resumeLabel({ name: "", fullName: "Dennis" })).toBe("Dennis");
    expect(resumeLabel({ name: " ", fullName: "" })).toBe("Untitled résumé");
  });
});
