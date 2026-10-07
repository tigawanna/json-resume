import type { MutationType } from "event-sourced-collection";
import { describe, expect, it } from "vitest";
import { planRestore, planSquash, type RestorableEvent } from "./squash-plan";

let seq = 0;
function event(
  key: string,
  type: MutationType,
  payload: Record<string, unknown> = {},
  previous: Record<string, unknown> | null = null,
  extra: Partial<RestorableEvent> = {},
): RestorableEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    collectionId: "resumeExperience",
    key,
    type,
    order: seq,
    at: seq * 10,
    payload,
    previous,
    ...extra,
  };
}

const ids = (events: readonly { id: string }[]) => events.map((e) => e.id);

describe("planSquash", () => {
  it("collapses a row's insert and updates into the latest update", () => {
    seq = 0;
    const events = [
      event("a", "insert", { role: "Dev" }),
      event("a", "update", { role: "Senior" }),
      event("a", "update", { role: "Lead" }),
    ];
    const plan = planSquash(events, { before: Infinity });
    expect(ids(plan.remove)).toEqual(["e1", "e2"]);
    expect(plan.reasons).toEqual({ superseded: 2, deleted: 0 });
    expect(plan.kept).toBe(1);
  });

  it("keeps only the tombstone of a deleted row", () => {
    seq = 0;
    const events = [event("a", "insert"), event("a", "update"), event("a", "delete")];
    const plan = planSquash(events, { before: Infinity });
    expect(ids(plan.remove)).toEqual(["e1", "e2"]);
    expect(plan.reasons).toEqual({ superseded: 0, deleted: 2 });
  });

  it("leaves events inside the retention window alone", () => {
    seq = 0;
    const events = [event("a", "insert"), event("a", "update"), event("a", "update")];
    const plan = planSquash(events, { before: 15 });
    expect(ids(plan.remove)).toEqual(["e1"]);
  });

  it("treats the same key in different collections as different rows", () => {
    seq = 0;
    const events = [event("a", "insert"), event("a", "insert", {}, null, { collectionId: "job" })];
    expect(planSquash(events, { before: Infinity }).remove).toEqual([]);
  });

  it("never removes pinned events but still lets them supersede", () => {
    seq = 0;
    const events = [
      event("a", "insert", {}, null, { pinned: true }),
      event("a", "update"),
      event("a", "update", {}, null, { pinned: true }),
    ];
    expect(ids(planSquash(events, { before: Infinity }).remove)).toEqual(["e2"]);
  });

  it("does not depend on input order", () => {
    seq = 0;
    const events = [event("a", "insert"), event("a", "update")].reverse();
    expect(ids(planSquash(events, { before: Infinity }).remove)).toEqual(["e1"]);
  });
});

describe("planRestore", () => {
  it("puts updated rows back to their state at the target", () => {
    seq = 0;
    const events = [
      event("a", "insert", { role: "Dev" }),
      event("a", "update", { role: "Senior" }, { role: "Dev" }),
      event("a", "update", { role: "Lead" }, { role: "Senior" }),
    ];
    expect(planRestore(events, "e2")).toEqual({
      steps: [
        { kind: "upsert", collectionId: "resumeExperience", key: "a", row: { role: "Senior" } },
      ],
      unknown: [],
    });
  });

  it("removes rows inserted after the target and revives rows deleted after it", () => {
    seq = 0;
    const events = [
      event("kept", "insert", { role: "Dev" }),
      event("marker", "insert"),
      event("added", "insert", { role: "New" }),
      event("kept", "delete", { role: "Dev" }, { role: "Dev" }),
    ];
    expect(planRestore(events, "e2").steps).toEqual([
      { kind: "remove", collectionId: "resumeExperience", key: "added" },
      { kind: "upsert", collectionId: "resumeExperience", key: "kept", row: { role: "Dev" } },
    ]);
  });

  it("falls back to previous when the row's earlier events were squashed", () => {
    seq = 0;
    const events = [
      event("marker", "insert"),
      event("a", "update", { role: "Lead" }, { role: "Senior" }),
    ];
    expect(planRestore(events, "e1").steps).toEqual([
      { kind: "upsert", collectionId: "resumeExperience", key: "a", row: { role: "Senior" } },
    ]);
  });

  it("reports rows whose earlier state is gone", () => {
    seq = 0;
    const events = [event("marker", "insert"), event("a", "update", { role: "Lead" }, null)];
    expect(planRestore(events, "e1")).toEqual({
      steps: [],
      unknown: [{ collectionId: "resumeExperience", key: "a" }],
    });
  });

  it("does nothing for the latest event or an unknown id", () => {
    seq = 0;
    const events = [event("a", "insert"), event("a", "update")];
    expect(planRestore(events, "e2").steps).toEqual([]);
    expect(planRestore(events, "missing").steps).toEqual([]);
  });
});
