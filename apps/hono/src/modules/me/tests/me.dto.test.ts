import { userZod } from "@repo/db/zod";
import { describe, expect, it } from "vitest";
import { updateMeInput } from "../me.dto";

describe("updateMeInput", () => {
  it("accepts a trimmed name from the user table schema", () => {
    expect(updateMeInput.parse({ name: "  Ada  " })).toEqual({ name: "Ada" });
  });

  it("rejects empty and overlong names", () => {
    expect(updateMeInput.safeParse({ name: "   " }).success).toBe(false);
    expect(updateMeInput.safeParse({ name: "a".repeat(121) }).success).toBe(false);
  });

  it("drops other user columns instead of redeclaring the whole row", () => {
    const parsed = updateMeInput.parse({ name: "Ada", email: "ada@example.com" });
    expect(parsed).toEqual({ name: "Ada" });
    expect(userZod.update.safeParse({ email: "ada@example.com" }).success).toBe(true);
  });
});
