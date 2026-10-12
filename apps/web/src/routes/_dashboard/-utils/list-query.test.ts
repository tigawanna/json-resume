import { createCollection, localOnlyCollectionOptions, queryOnce } from "@tanstack/db";
import { describe, expect, it } from "vitest";
import {
  keywordPattern,
  listOffset,
  listSortDirection,
  totalPagesFromCount,
  writtenForResumes,
} from "./list-query";

type LinkedRow = { id: string; resumeId?: string | null; jobId: string | null };

describe("writtenForResumes", () => {
  it("keeps rows written with a picked résumé, and résumé-less rows for its job", async () => {
    const rows = createCollection(
      localOnlyCollectionOptions({
        getKey: (row: LinkedRow) => row.id,
        initialData: [
          { id: "picked", resumeId: "r1", jobId: "j-elsewhere" },
          { id: "job-only", resumeId: null, jobId: "j1" },
          { id: "job-only-legacy", jobId: "j1" },
          { id: "other-resume-same-job", resumeId: "r2", jobId: "j1" },
          { id: "unrelated", resumeId: null, jobId: "j2" },
        ],
      }),
    );
    const matched = await queryOnce((q) =>
      q
        .from({ row: rows })
        .where(({ row }) => writtenForResumes(row.resumeId, row.jobId, ["r1"], ["j1"])),
    );
    expect(matched.map((row) => row.id).sort()).toEqual(["job-only", "job-only-legacy", "picked"]);
  });
});

describe("listOffset", () => {
  it("uses page 1 for invalid page numbers", () => {
    expect(listOffset(1, 20)).toBe(0);
    expect(listOffset(2, 20)).toBe(20);
    expect(listOffset(0, 20)).toBe(0);
    expect(listOffset(-3, 20)).toBe(0);
    expect(listOffset(Number.NaN, 20)).toBe(0);
  });
});

describe("totalPagesFromCount", () => {
  it("returns 0 for empty lists and ceil-divides otherwise", () => {
    expect(totalPagesFromCount(0, 20)).toBe(0);
    expect(totalPagesFromCount(20, 20)).toBe(1);
    expect(totalPagesFromCount(21, 20)).toBe(2);
    expect(totalPagesFromCount(100, 20)).toBe(5);
  });
});

describe("listSortDirection", () => {
  it("falls back to desc unless the value is a known direction", () => {
    expect(listSortDirection(undefined)).toBe("desc");
    expect(listSortDirection("asc")).toBe("asc");
    expect(listSortDirection("desc")).toBe("desc");
    expect(listSortDirection("sideways")).toBe("desc");
  });
});

describe("keywordPattern", () => {
  it("wraps a trimmed query in SQL-style wildcards", () => {
    expect(keywordPattern("  Acme  ")).toBe("%Acme%");
  });
});
