// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { OutboundEvent, PushResponse } from "event-sourced-collection";
import {
  chunkOutboundEvents,
  jsonByteLength,
  pushEventsInChunks,
  type SyncPushLog,
} from "./sync-push-chunks";

function captureLog(): SyncPushLog & { infoCalls: unknown[][]; errorCalls: unknown[][] } {
  const infoCalls: unknown[][] = [];
  const errorCalls: unknown[][] = [];
  return {
    infoCalls,
    errorCalls,
    info(message, details) {
      infoCalls.push([message, details]);
    },
    error(message, details) {
      errorCalls.push([message, details]);
    },
  };
}

function event(eventId: string, payload: Record<string, unknown>): OutboundEvent {
  return {
    eventId,
    collectionId: "resume",
    type: "update",
    key: eventId,
    payload,
    previous: null,
    txId: eventId,
    clientId: "client",
    schemaVersion: 1,
    baseVersion: null,
    timestamp: 1,
  };
}

function confirm(events: readonly OutboundEvent[]): PushResponse {
  return {
    confirmed: events.map((item, index) => ({ eventId: item.eventId, globalSeq: index + 1 })),
    failed: [],
  };
}

describe("chunkOutboundEvents", () => {
  it("keeps a small batch in one chunk", () => {
    const events = [event("a", { text: "one" }), event("b", { text: "two" })];
    expect(chunkOutboundEvents(events, 1_000_000)).toEqual([events]);
  });

  it("starts the next chunk when another event would pass the byte cap", () => {
    const events = [event("a", { text: "a".repeat(40) }), event("b", { text: "b".repeat(40) })];
    const one = jsonByteLength([events[0]]);
    const both = jsonByteLength(events);
    expect(one).toBeLessThan(both);

    const chunks = chunkOutboundEvents(events, one);
    expect(chunks).toEqual([[events[0]], [events[1]]]);
    expect(jsonByteLength(chunks[0])).toBeLessThanOrEqual(one);
  });

  it("keeps packed chunk sizes equal to the serialized JSON", () => {
    const events = [
      event("a", { text: "héllo" }),
      event("b", { text: "b".repeat(40) }),
      event("c", { text: "ok" }),
    ];
    const cap = jsonByteLength([events[0], events[1]]);
    const chunks = chunkOutboundEvents(events, cap);
    expect(chunks.map((chunk) => chunk.map((item) => item.eventId))).toEqual([["a", "b"], ["c"]]);
    for (const chunk of chunks) {
      expect(jsonByteLength(chunk)).toBeLessThanOrEqual(cap);
    }
  });

  it("leaves an event that is larger than the cap in its own chunk", () => {
    const huge = event("huge", { text: "x".repeat(200) });
    const next = event("next", { text: "ok" });
    const chunks = chunkOutboundEvents([huge, next], 50);
    expect(chunks).toEqual([[huge], [next]]);
  });
});

describe("pushEventsInChunks", () => {
  it("posts the next chunk only after the previous one is accepted", async () => {
    const events = [event("a", { text: "a".repeat(40) }), event("b", { text: "b".repeat(40) })];
    const cap = jsonByteLength([events[0]]);
    const posted: string[][] = [];
    const log = captureLog();

    const first = await pushEventsInChunks(
      events,
      async (chunk) => {
        posted.push(chunk.map((item) => item.eventId));
        return confirm(chunk);
      },
      cap,
      log,
    );
    const second = await pushEventsInChunks(
      events.slice(1),
      async (chunk) => {
        posted.push(chunk.map((item) => item.eventId));
        return confirm(chunk);
      },
      cap,
      log,
    );

    expect(posted).toEqual([["a"], ["b"]]);
    expect(log.infoCalls[0]?.[0]).toBe(
      "pushing one chunk; the rest waits until this chunk is recorded",
    );
    expect(first.confirmed.map((item) => item.eventId)).toEqual(["a"]);
    expect(first.failed).toEqual([]);
    expect(second.confirmed.map((item) => item.eventId)).toEqual(["b"]);
  });

  it("keeps accepted chunks and retries from the chunk that failed", async () => {
    const events = [
      event("a", { text: "a".repeat(30) }),
      event("b", { text: "b".repeat(30) }),
      event("c", { text: "c".repeat(30) }),
    ];
    const cap = jsonByteLength([events[0]]);
    const posted: string[] = [];
    const log = captureLog();

    const post = async (chunk: readonly OutboundEvent[]) => {
      const id = chunk[0]?.eventId;
      posted.push(id ?? "");
      if (id === "b") throw new Error("Sync push failed (500): unavailable");
      return confirm(chunk);
    };

    const first = await pushEventsInChunks(events, post, cap, log);
    const second = await pushEventsInChunks(events.slice(1), post, cap, log);

    expect(posted).toEqual(["a", "b"]);
    expect(first.confirmed.map((item) => item.eventId)).toEqual(["a"]);
    expect(first.failed).toEqual([]);
    expect(second.failed?.map((item) => item.eventId)).toEqual(["b"]);
    expect(second.failed?.every((item) => item.retryable === true)).toBe(true);
    expect(log.errorCalls[0]?.[0]).toBe("chunk post failed; later events stay in the outbox");
  });

  it("sends a too-large chunk one event at a time", async () => {
    const events = [
      event("a", { text: "a" }),
      event("b", { text: "b" }),
      event("c", { text: "c" }),
    ];
    const posted: string[][] = [];
    const log = captureLog();

    const result = await pushEventsInChunks(
      events,
      async (chunk) => {
        posted.push(chunk.map((item) => item.eventId));
        if (chunk.length > 1) throw new Error("Sync push failed (413): Request Entity Too Large");
        if (chunk[0]?.eventId === "b") {
          throw new Error(
            "Sync push failed (413): Request Entity Too Large FUNCTION_PAYLOAD_TOO_LARGE",
          );
        }
        return confirm(chunk);
      },
      10_000_000,
      log,
    );

    expect(posted).toEqual([["a", "b", "c"], ["a"]]);
    expect(result.confirmed.map((item) => item.eventId)).toEqual(["a"]);
    expect(result.failed).toEqual([]);
    expect(
      log.infoCalls.some(
        (call) => call[0] === "chunk rejected as too large; sending the first event",
      ),
    ).toBe(true);
  });

  it("rejects an event that cannot fit and still pushes the events after it", async () => {
    const next = event("next", { text: "ok" });
    const huge = event("huge", { text: "x".repeat(500) });
    const cap = jsonByteLength([next]);
    const posted: string[] = [];
    const log = captureLog();

    const result = await pushEventsInChunks(
      [huge, next],
      async (chunk) => {
        posted.push(chunk[0]?.eventId ?? "");
        return confirm(chunk);
      },
      cap,
      log,
    );

    expect(posted).toEqual(["next"]);
    expect(result.confirmed.map((item) => item.eventId)).toEqual(["next"]);
    expect(result.failed).toEqual([
      expect.objectContaining({
        eventId: "huge",
        code: "PAYLOAD_TOO_LARGE",
        retryable: false,
      }),
    ]);
    expect(log.errorCalls[0]?.[0]).toBe("single event exceeds push limit");
    expect(log.errorCalls[0]?.[1]).toMatchObject({
      eventCount: 1,
      largestEvent: { eventId: "huge", collectionId: "resume" },
    });
  });
});
