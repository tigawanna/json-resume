import type { OutboundEvent, PushFailure, PushResponse } from "event-sourced-collection";
import { noteUploadChunk } from "./sync-progress";

/**
 * Stay under Vercel's 4.5 MB function body cap. The platform rejects the
 * request before the route runs, so each POST has to fit on its own.
 */
export const SYNC_PUSH_MAX_BYTES = 3_500_000;

const textEncoder = new TextEncoder();

export function jsonByteLength(value: unknown): number {
  return textEncoder.encode(JSON.stringify(value)).length;
}

type JsonPack<T> = {
  items: T[];
  /** UTF-8 size of `JSON.stringify(items)`, measured one event at a time. */
  bytes: number;
};

/**
 * Split events into JSON arrays that each fit in `maxBytes`.
 * Each event is serialized once. A single event larger than the cap is
 * returned alone so the caller can skip it and continue after it.
 */
function packByJsonBytes<T>(events: readonly T[], maxBytes: number): JsonPack<T>[] {
  const packs: JsonPack<T>[] = [];
  let items: T[] = [];
  let bytes = 2;

  for (const event of events) {
    const eventBytes = jsonByteLength(event);
    const nextBytes = items.length === 0 ? 2 + eventBytes : bytes + 1 + eventBytes;
    if (items.length > 0 && nextBytes > maxBytes) {
      packs.push({ items, bytes });
      items = [event];
      bytes = 2 + eventBytes;
      continue;
    }
    items.push(event);
    bytes = nextBytes;
  }

  if (items.length > 0) packs.push({ items, bytes });
  return packs;
}

export function chunkOutboundEvents<T>(events: readonly T[], maxBytes: number): T[][] {
  return packByJsonBytes(events, maxBytes).map((pack) => pack.items);
}

function oversizedFailure(event: OutboundEvent, maxBytes: number): PushFailure {
  return {
    eventId: event.eventId,
    message: `Sync event is ${jsonByteLength(event)} bytes and exceeds the ${maxBytes} byte push limit`,
    code: "PAYLOAD_TOO_LARGE",
    retryable: false,
  };
}

function transportFailure(event: OutboundEvent, message: string): PushFailure {
  return {
    eventId: event.eventId,
    message,
    code: "PUSH_FAILED",
    retryable: true,
  };
}

function isPayloadTooLarge(message: string): boolean {
  return (
    message.includes("413") ||
    message.includes("PAYLOAD_TOO_LARGE") ||
    message.includes("Request Entity Too Large")
  );
}

export type SyncPushLog = {
  info: (message: string, details: Record<string, unknown>) => void;
  error: (message: string, details: Record<string, unknown>) => void;
};

const consoleSyncPushLog: SyncPushLog = {
  info(message, details) {
    console.info(`[sync push] ${message}`, details);
  },
  error(message, details) {
    console.error(`[sync push] ${message}`, details);
  },
};

function summarizeChunk(chunk: readonly OutboundEvent[]) {
  let largest = chunk[0];
  let largestBytes = 0;
  for (const event of chunk) {
    const bytes = jsonByteLength(event);
    if (!largest || bytes > largestBytes) {
      largest = event;
      largestBytes = bytes;
    }
  }
  return {
    eventCount: chunk.length,
    bytes: jsonByteLength(chunk),
    largestEvent: largest
      ? {
          eventId: largest.eventId,
          collectionId: largest.collectionId,
          type: largest.type,
          key: largest.key,
          bytes: largestBytes,
        }
      : null,
  };
}

/**
 * POST one capped chunk, then return so those rows can leave the outbox
 * before the next chunk starts. Events not attempted stay pending.
 * A chunk the server rejects as too large is retried as its first event only.
 */
export async function pushEventsInChunks(
  events: readonly OutboundEvent[],
  postChunk: (chunk: readonly OutboundEvent[]) => Promise<PushResponse>,
  maxBytes = SYNC_PUSH_MAX_BYTES,
  log: SyncPushLog = consoleSyncPushLog,
): Promise<PushResponse> {
  const confirmed: PushResponse["confirmed"][number][] = [];
  const failed: PushFailure[] = [];
  const packs = packByJsonBytes(events, maxBytes);

  const firstPack = packs[0];
  if (packs.length > 1 && firstPack) {
    log.info("pushing one chunk; the rest waits until this chunk is recorded", {
      eventCount: events.length,
      chunkEventCount: firstPack.items.length,
      chunkBytes: firstPack.bytes,
      remainingEventCount: events.length - firstPack.items.length,
      maxBytes,
    });
  }

  for (let index = 0; index < packs.length; index++) {
    const pack = packs[index];
    if (!pack) continue;
    const chunk = pack.items;
    const summary = summarizeChunk(chunk);

    if (pack.bytes > maxBytes) {
      log.error("single event exceeds push limit", { chunkIndex: index, maxBytes, ...summary });
      const event = chunk[0];
      if (event) failed.push(oversizedFailure(event, maxBytes));
      continue;
    }

    try {
      noteUploadChunk(chunk.length, pack.bytes);
      absorbResponse(index, summary, await postChunk(chunk));
      return { confirmed, failed };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync push failed";
      const first = chunk[0];
      if (chunk.length > 1 && first && isPayloadTooLarge(message)) {
        log.info("chunk rejected as too large; sending the first event", {
          chunkIndex: index,
          ...summary,
          message,
        });
        await postSingleEvent(first);
        return { confirmed, failed };
      }
      log.error("chunk post failed; later events stay in the outbox", {
        chunkIndex: index,
        ...summary,
        message,
      });
      for (const event of chunk) failed.push(transportFailure(event, message));
      return { confirmed, failed };
    }
  }

  return { confirmed, failed };

  async function postSingleEvent(event: OutboundEvent) {
    const alone = [event];
    const summary = summarizeChunk(alone);
    if (summary.bytes > maxBytes) {
      failed.push(oversizedFailure(event, maxBytes));
      return;
    }
    try {
      noteUploadChunk(1, summary.bytes);
      absorbResponse(-1, summary, await postChunk(alone));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync push failed";
      log.error("single event post failed", { ...summary, message });
      failed.push(
        isPayloadTooLarge(message)
          ? { eventId: event.eventId, message, code: "PAYLOAD_TOO_LARGE", retryable: false }
          : transportFailure(event, message),
      );
    }
  }

  function absorbResponse(
    chunkIndex: number,
    summary: ReturnType<typeof summarizeChunk>,
    response: PushResponse,
  ) {
    confirmed.push(...response.confirmed);
    if (!response.failed?.length) return;
    log.error("server rejected events in chunk", {
      chunkIndex,
      ...summary,
      failed: response.failed.map((item) => ({
        eventId: item.eventId,
        code: item.code ?? null,
        message: item.message,
      })),
    });
    failed.push(...response.failed);
  }
}
