import { describe, expect, it } from "vitest";
import { parseResourceName } from "../names";

describe("parseResourceName", () => {
  it("builds kebab, pascal, and camel names", () => {
    expect(parseResourceName({ raw: "Resume-Credits" })).toEqual({
      kebab: "resume-credits",
      pascal: "ResumeCredits",
      camel: "resumeCredits",
    });
  });

  it("rejects reserved identifiers", () => {
    expect(() => parseResourceName({ raw: "new" })).toThrow(/reserved/);
  });

  it("rejects non kebab-case names", () => {
    expect(() => parseResourceName({ raw: "resume_credits" })).toThrow(/kebab-case/);
  });
});
