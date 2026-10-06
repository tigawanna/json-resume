import type { OutboundEvent, PushFailure, PushResponse } from "event-sourced-collection";

/**
 * Stay under Vercel's 4.5 MB function body cap. The platform rejects the
 * request before the route runs, so each POST has to fit on its own.
 */
export const SYNC_PUSH_MAX_BYTES = 3_500_000;

const textEncoder = new TextEncoder();

export function jsonByteLength(value: unknown): number {
  return textEncoder.encode(JSON.stringify(value)).length;
}

/**
 * Split events into JSON arrays that each fit in `maxBytes`.
 * A single event larger than the cap is returned alone so the caller can
 * skip it and continue with the events after it.
 */
export function chunkOutboundEvents<T>(events: readonly T[], maxBytes: number): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];

  for (const event of events) {
    if (current.length === 0) {
      current = [event];
      continue;
    }
    const candidate = [...current, event];
    if (jsonByteLength(candidate) > maxBytes) {
      chunks.push(current);
      current = [event];
      continue;
    }
    current = candidate;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
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
 * POST one capped chunk at a time. Accepted chunks stay confirmed.
 * A chunk the server still rejects as too large is sent again as one event
 * per request. One event that cannot fit in a request is rejected on its own
 * so the events after it still send. Any other failure retries from that event.
 */
export async function pushEventsInChunks(
  events: readonly OutboundEvent[],
  postChunk: (chunk: readonly OutboundEvent[]) => Promise<PushResponse>,
  maxBytes = SYNC_PUSH_MAX_BYTES,
  log: SyncPushLog = consoleSyncPushLog,
): Promise<PushResponse> {
  const confirmed: PushResponse["confirmed"][number][] = [];
  const failed: PushFailure[] = [];
  const chunks = chunkOutboundEvents(events, maxBytes);

  if (chunks.length > 1) {
    log.info("split push into chunks", {
      eventCount: events.length,
      totalBytes: jsonByteLength(events),
      maxBytes,
      chunks: chunks.map(summarizeChunk),
    });
  }

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    if (!chunk) continue;
    const summary = summarizeChunk(chunk);

    if (summary.bytes > maxBytes && chunk.length > 1) {
      log.info("chunk exceeds push limit; sending events one by one", {
        chunkIndex: index,
        maxBytes,
        ...summary,
      });
      const stopMessage = await postEventsOneByOne(chunk);
      if (stopMessage) {
        stopAfter(index, stopMessage);
        break;
      }
      continue;
    }

    if (summary.bytes > maxBytes) {
      log.error("single event exceeds push limit", { chunkIndex: index, maxBytes, ...summary });
      for (const event of chunk) failed.push(oversizedFailure(event, maxBytes));
      continue;
    }

    try {
      absorbResponse(index, summary, await postChunk(chunk));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync push failed";
      if (chunk.length > 1 && isPayloadTooLarge(message)) {
        log.info("chunk rejected as too large; sending events one by one", {
          chunkIndex: index,
          ...summary,
          message,
        });
        const stopMessage = await postEventsOneByOne(chunk);
        if (stopMessage) {
          stopAfter(index, stopMessage);
          break;
        }
        continue;
      }
      const remaining = chunks.slice(index).flat();
      log.error("chunk post failed; later chunks not sent", {
        chunkIndex: index,
        chunkCount: chunks.length,
        ...summary,
        remainingEventCount: remaining.length,
        message,
      });
      for (const event of remaining) failed.push(transportFailure(event, message));
      break;
    }
  }

  function stopAfter(chunkIndex: number, message: string) {
    for (const event of chunks.slice(chunkIndex + 1).flat()) {
      failed.push(transportFailure(event, message));
    }
  }

  /** Returns a message when a non-size failure should stop the events still waiting. */
  async function postEventsOneByOne(chunk: readonly OutboundEvent[]): Promise<string | null> {
    for (let index = 0; index < chunk.length; index++) {
      const event = chunk[index];
      if (!event) continue;
      const alone = [event];
      const summary = summarizeChunk(alone);
      if (summary.bytes > maxBytes) {
        log.error("single event exceeds push limit", { maxBytes, ...summary });
        failed.push(oversizedFailure(event, maxBytes));
        continue;
      }
      try {
        absorbResponse(-1, summary, await postChunk(alone));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Sync push failed";
        log.error("single event post failed", { ...summary, message });
        if (isPayloadTooLarge(message)) {
          failed.push({
            eventId: event.eventId,
            message,
            code: "PAYLOAD_TOO_LARGE",
            retryable: false,
          });
          continue;
        }
        const remaining = chunk.slice(index);
        for (const leftover of remaining) failed.push(transportFailure(leftover, message));
        return message;
      }
    }
    return null;
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

  return { confirmed, failed };
}
