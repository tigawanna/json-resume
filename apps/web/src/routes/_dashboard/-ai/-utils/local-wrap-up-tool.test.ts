// @vitest-environment node
import { describe, expect, it } from "vitest";
import { useLocalToolDb } from "./local-tool-fixtures";
import { wrapUpLocal } from "./local-wrap-up-tool";

const fixture = useLocalToolDb();
const { context, insertResume } = fixture;

describe("wrapUpLocal", () => {
  it("names each résumé and keeps the model's role and note", () => {
    insertResume("draft", 2, { name: "Acme backend" });
    insertResume("base", 1, { name: "General" });

    const result = wrapUpLocal(context(), {
      summary: "Tailored a copy for Acme.",
      resumes: [
        { resumeId: "draft", role: "created" },
        { resumeId: "base", role: "inspiration", note: "Bullets and skills" },
      ],
    });

    expect(result).toEqual({
      resumes: [
        { resumeId: "draft", role: "created", name: "Acme backend" },
        { resumeId: "base", role: "inspiration", name: "General", note: "Bullets and skills" },
      ],
      unknownResumeIds: [],
    });
  });

  it("drops ids that are not local résumés and repeats of the same role", () => {
    insertResume("draft", 1, { name: "Draft" });

    const result = wrapUpLocal(context(), {
      summary: "Done.",
      resumes: [
        { resumeId: "draft", role: "edited" },
        { resumeId: "draft", role: "edited" },
        { resumeId: "made-up", role: "inspiration" },
      ],
    });

    expect(result.resumes).toEqual([{ resumeId: "draft", role: "edited", name: "Draft" }]);
    expect(result.unknownResumeIds).toEqual(["made-up"]);
  });
});
