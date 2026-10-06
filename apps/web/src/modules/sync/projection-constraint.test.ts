import { describe, expect, it } from "vitest";
import { uniqueConstraintColumns } from "./projection-constraint";

describe("uniqueConstraintColumns", () => {
  it("reads every column from a sqlite unique error", () => {
    const err = new Error(
      "SQLITE_CONSTRAINT: UNIQUE constraint failed: resume_experience_item.resume_id, resume_experience_item.experience_id",
    );
    expect(uniqueConstraintColumns(err)).toEqual(["resume_id", "experience_id"]);
  });

  it("reads the message wrapped as a cause", () => {
    const err = new Error("insert failed", {
      cause: new Error(
        "UNIQUE constraint failed: resume_skill_group_item.resume_id, resume_skill_group_item.group_id",
      ),
    });
    expect(uniqueConstraintColumns(err)).toEqual(["resume_id", "group_id"]);
  });

  it("returns null for a foreign key failure", () => {
    expect(uniqueConstraintColumns(new Error("FOREIGN KEY constraint failed"))).toBeNull();
  });
});
