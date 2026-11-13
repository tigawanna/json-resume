// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { openTestAppDb } from "@/data-access-layer/event-sourced/testing/app-test-db";
import type { DashboardToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  assertMutateCollection,
  mutateCollection,
  queryCollection,
} from "./local-collection-tools";

const embeddable = { searchableText: "", embedding: null, embeddingModel: null };
const lib = { userId: "u1", ...embeddable, createdAt: 1, updatedAt: 1 };

let handle: ReturnType<typeof openTestAppDb>;
let db: AppDb;

beforeEach(async () => {
  handle = openTestAppDb();
  db = await handle.ensureDb();
});

afterEach(() => handle.close());

function context(
  pack: DashboardToolContext["getToolPack"] extends () => infer Pack ? Pack : never,
): DashboardToolContext {
  return {
    db,
    userId: "u1",
    getActiveResumeId: () => null,
    setActiveResumeId() {},
    openResume() {},
    changes: [],
    handOff() {},
    getGroupTitleIds: () => [],
    getActiveConversationId: () => "active",
    getToolPack: () => pack,
  };
}

describe("query_collection and mutate_collection", () => {
  it("pages keyword matches and reads one row by id", () => {
    db.collections.resumeNote.insert({
      id: "n1",
      label: "Billing",
      text: "Shipped invoices",
      sortOrder: 0,
      ...lib,
      updatedAt: 2,
    });
    db.collections.resumeNote.insert({
      id: "n2",
      label: "Other",
      text: "Unrelated",
      sortOrder: 1,
      ...lib,
      updatedAt: 1,
    });

    const page = queryCollection(context("library"), {
      collection: "resumeNote",
      keyword: "billing",
      limit: 1,
      offset: 0,
    });
    expect(page.total).toBe(1);
    expect(page.items[0]?.id).toBe("n1");
    expect(page.items[0]).not.toHaveProperty("userId");

    const one = queryCollection(context("library"), { collection: "resumeNote", id: "n2" });
    expect(one.items[0]?.label).toBe("Other");
    expect(() =>
      queryCollection(context("library"), { collection: "resumeNote", id: "missing" }),
    ).toThrow(/missing/);
  });

  it("patches one field and leaves the rest", () => {
    db.collections.resumeNote.insert({
      id: "n1",
      label: "Billing",
      text: "Shipped invoices",
      sortOrder: 0,
      ...lib,
    });
    mutateCollection(context("library"), {
      collection: "resumeNote",
      op: "update",
      id: "n1",
      values: { label: "Invoices" },
    });
    const row = db.collections.resumeNote.get("n1");
    expect(row?.label).toBe("Invoices");
    expect(row?.text).toBe("Shipped invoices");
  });

  it("rejects résumé documents, settings, and experience bullets", () => {
    expect(() => assertMutateCollection("resume")).toThrow(/cannot change/);
    expect(() => assertMutateCollection("settings")).toThrow(/cannot change/);
    expect(() => assertMutateCollection("resumeExperienceBullet")).toThrow(/cannot change/);
  });

  it("refuses an unknown field", () => {
    db.collections.resumeNote.insert({
      id: "n1",
      label: "Billing",
      text: "Shipped invoices",
      sortOrder: 0,
      ...lib,
    });
    expect(() =>
      mutateCollection(context("library"), {
        collection: "resumeNote",
        op: "update",
        id: "n1",
        values: { userId: "someone-else" },
      }),
    ).toThrow(/Unknown field/);
  });

  it("deletes an experience together with its bullets", () => {
    db.collections.resumeExperience.insert({
      id: "exp1",
      company: "Acme",
      role: "Engineer",
      startDate: "2020",
      endDate: "2022",
      location: "",
      sortOrder: 0,
      ...lib,
    });
    db.collections.resumeExperienceBullet.insert({
      id: "b1",
      experienceId: "exp1",
      text: "Shipped billing",
      sortOrder: 0,
      ...lib,
    });
    mutateCollection(context("library"), {
      collection: "resumeExperience",
      op: "delete",
      id: "exp1",
    });
    expect(db.collections.resumeExperience.get("exp1")).toBeUndefined();
    expect(db.collections.resumeExperienceBullet.get("b1")).toBeUndefined();
  });

  it("does not write on a read-only page", () => {
    expect(() =>
      mutateCollection(context("none"), {
        collection: "resumeNote",
        op: "insert",
        values: { label: "A", text: "B" },
      }),
    ).toThrow(/does not allow/);
  });
});
