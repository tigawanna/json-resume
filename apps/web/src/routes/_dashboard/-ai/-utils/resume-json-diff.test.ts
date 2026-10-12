import { describe, expect, it } from "vitest";
import { diffResumeJson } from "./resume-json-diff";

const before = JSON.stringify(
  { header: { fullName: "Ada", headline: "Engineer" }, summary: "Builds things.", skills: ["TS"] },
  null,
  2,
);

describe("diffResumeJson", () => {
  it("reports nothing for identical documents", () => {
    expect(diffResumeJson(before, before)).toEqual({ hunks: [], added: 0, removed: 0 });
  });

  it("returns changed lines with context and counts", () => {
    const after = before
      .replace('"Builds things."', '"Ships reliable systems."')
      .replace('"TS"', '"TS",\n    "Go"');
    const { hunks, added, removed } = diffResumeJson(before, after, 1);

    expect(added).toBe(3);
    expect(removed).toBe(2);
    const lines = hunks.flatMap((hunk) => hunk.lines);
    expect(lines).toContainEqual({ kind: "remove", text: '  "summary": "Builds things.",' });
    expect(lines).toContainEqual({ kind: "add", text: '  "summary": "Ships reliable systems.",' });
    expect(lines).toContainEqual({ kind: "add", text: '    "Go"' });
    expect(lines.some((line) => line.kind === "context")).toBe(true);
  });
});
