import { describe, expect, it } from "vitest";
import { nextOffset, searchTerms } from "./search-page";

describe("searchTerms", () => {
  it("splits on whitespace and lowercases", () => {
    expect(searchTerms("  Senior   React\tRemote ")).toEqual(["senior", "react", "remote"]);
  });

  it("returns no terms for blank or missing keywords", () => {
    expect(searchTerms(undefined)).toEqual([]);
    expect(searchTerms("   ")).toEqual([]);
  });
});

describe("nextOffset", () => {
  it("points at the next page while matches remain", () => {
    expect(nextOffset(21, 0, 20)).toBe(20);
    expect(nextOffset(5, 2, 2)).toBe(4);
  });

  it("is null once everything has been returned", () => {
    expect(nextOffset(20, 0, 20)).toBeNull();
    expect(nextOffset(5, 10, 0)).toBeNull();
  });
});
