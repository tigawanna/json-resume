import { describe, expect, it } from "vitest";
import { INITIAL_CONTEXT_COMPACTION, reduceContextCompaction } from "./context-compaction";

const started = { before: 7_200, messagesBefore: 14, reusedCheckpoint: false, maxTokens: 5_000 };
const ended = {
  after: 2_300,
  messagesAfter: 6,
  reusedCheckpoint: false,
  maxTokens: 5_000,
  durationMs: 1,
};

describe("reduceContextCompaction", () => {
  it("tracks a compaction from start to end", () => {
    const running = reduceContextCompaction(
      INITIAL_CONTEXT_COMPACTION,
      "compaction:started",
      started,
      3,
    );
    expect(running.running).toMatchObject({ before: 7_200, turn: 3 });
    expect(running.last).toBeNull();

    const done = reduceContextCompaction(running, "compaction:ended", ended, 3);
    expect(done.running).toBeNull();
    expect(done.last).toEqual({
      before: 7_200,
      after: 2_300,
      messagesBefore: 14,
      messagesAfter: 6,
      maxTokens: 5_000,
      turn: 3,
    });
  });

  it("keeps the previous result when a compaction shrinks nothing", () => {
    const first = reduceContextCompaction(
      reduceContextCompaction(INITIAL_CONTEXT_COMPACTION, "compaction:started", started, 1),
      "compaction:ended",
      ended,
      1,
    );
    const stuck = reduceContextCompaction(
      reduceContextCompaction(first, "compaction:started", started, 2),
      "compaction:ended",
      { ...ended, after: 7_200, messagesAfter: 14 },
      2,
    );
    expect(stuck.running).toBeNull();
    expect(stuck.last).toEqual(first.last);
  });

  it("ignores unrelated and malformed events", () => {
    const state = INITIAL_CONTEXT_COMPACTION;
    expect(reduceContextCompaction(state, "memory:state", started, 1)).toBe(state);
    expect(reduceContextCompaction(state, "compaction:started", { before: "lots" }, 1)).toBe(state);
    expect(reduceContextCompaction(state, "compaction:ended", ended, 1)).toBe(state);
  });
});
