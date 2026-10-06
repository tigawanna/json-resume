import { describe, expect, it } from "vitest";
import {
  eventsThatFit,
  limitsAfterTooLarge,
  recordAcceptedPush,
  stepBelow,
} from "./sync-push-tuning";

describe("sync push tuning", () => {
  it("steps down 50 → 40 → 30 → 20 → 10 → 5 → 1", () => {
    const ladder = [50];
    while (ladder.at(-1)! > 1) ladder.push(stepBelow(ladder.at(-1)!));
    expect(ladder).toEqual([50, 40, 30, 20, 10, 5, 1]);
    expect(stepBelow(37)).toBe(30);
  });

  it("drops the batch size a rung and caps bytes under the rejected request", () => {
    const next = limitsAfterTooLarge(
      { pushBatchSize: 50, maxPushBytes: 3_500_000 },
      undefined,
      { events: 50, bytes: 3_000_000, status: "too-large" },
      1_000,
    );
    expect(next?.limits).toEqual({ pushBatchSize: 40, maxPushBytes: 2_400_000 });
    expect(next?.stats.lastTooLarge).toMatchObject({ droppedFrom: 50, droppedTo: 40 });
  });

  it("follows the library's 413 halving down instead of only one rung", () => {
    const next = limitsAfterTooLarge(
      { pushBatchSize: 40, maxPushBytes: null },
      undefined,
      { events: 13, bytes: 2_000_000, status: "too-large" },
      0,
    );
    expect(next?.limits.pushBatchSize).toBe(10);
  });

  it("does not lower limits for a single oversized event", () => {
    expect(
      limitsAfterTooLarge(
        { pushBatchSize: 10, maxPushBytes: 3_500_000 },
        undefined,
        { events: 1, bytes: 9_000_000, status: "too-large" },
        0,
      ),
    ).toBeNull();
  });

  it("estimates how many events fit from the running average", () => {
    let stats = recordAcceptedPush(undefined, { events: 10, bytes: 2_000_000, status: "ok" });
    stats = recordAcceptedPush(stats, { events: 10, bytes: 1_000_000, status: "ok" });
    expect(stats.avgEventBytes).toBe(150_000);
    expect(stats.largestOkEvents).toBe(10);
    expect(eventsThatFit(3_000_000, stats)).toBe(20);
    expect(eventsThatFit(null, stats)).toBeNull();
  });
});
