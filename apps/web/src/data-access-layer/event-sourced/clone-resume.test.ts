import { describe, expect, it } from "vitest";
import { copyName } from "./clone-resume";

describe("copyName", () => {
  it("adds (copy), then numbers further copies", () => {
    expect(copyName("CV", ["CV"])).toBe("CV (copy)");
    expect(copyName("CV", ["CV", "CV (copy)"])).toBe("CV (copy 2)");
    expect(copyName("CV", ["CV", "CV (copy)", "CV (copy 2)"])).toBe("CV (copy 3)");
  });

  it("counts from the original name when cloning a copy", () => {
    expect(copyName("CV (copy)", ["CV", "CV (copy)"])).toBe("CV (copy 2)");
    expect(copyName("CV (copy 2)", ["CV", "CV (copy)", "CV (copy 2)"])).toBe("CV (copy 3)");
  });
});
