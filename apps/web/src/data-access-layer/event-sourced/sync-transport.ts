import type {
  PullResponse,
  PushConfirmation,
  PushFailure,
  PushResponse,
  SyncTransport,
} from "event-sourced-collection";
import { pushEventsInChunks } from "./sync-push-chunks";

const SYNC_URL = "/api/sync/events";

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as unknown;
}

function isPushConfirmation(value: unknown): value is PushConfirmation {
  if (value == null || typeof value !== "object") return false;
  if (!("eventId" in value) || !("globalSeq" in value)) return false;
  return typeof value.eventId === "string" && typeof value.globalSeq === "number";
}

function isPushFailure(value: unknown): value is PushFailure {
  if (value == null || typeof value !== "object") return false;
  if (!("eventId" in value) || !("message" in value)) return false;
  return typeof value.eventId === "string" && typeof value.message === "string";
}

function parsePushResponse(value: unknown): PushResponse {
  if (value == null || typeof value !== "object" || !("confirmed" in value)) {
    throw new Error("Sync push failed: invalid response");
  }
  if (!Array.isArray(value.confirmed)) {
    throw new Error("Sync push failed: invalid response");
  }
  const confirmedEvents = value.confirmed.filter(isPushConfirmation);
  if (confirmedEvents.length !== value.confirmed.length) {
    throw new Error("Sync push failed: invalid response");
  }
  if (!("failed" in value) || value.failed == null) return { confirmed: confirmedEvents };
  if (!Array.isArray(value.failed)) {
    throw new Error("Sync push failed: invalid response");
  }
  const failedEvents = value.failed.filter(isPushFailure);
  if (failedEvents.length !== value.failed.length) {
    throw new Error("Sync push failed: invalid response");
  }
  return { confirmed: confirmedEvents, failed: failedEvents };
}

/**
 * Cookie-session transport. Push/pull never run unless the DB has sync enabled;
 * the server still 401s if there is no session.
 */
export function createCookieSyncTransport(): SyncTransport {
  return {
    async push(events) {
      return pushEventsInChunks(events, async (chunk) => {
        const response = await fetch(SYNC_URL, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk),
        });
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Sync push failed (${response.status}): ${body}`);
        }
        return parsePushResponse(await readJson(response));
      });
    },
    async pull(since) {
      // console.log("pull === ", since);
      const url = `${SYNC_URL}?since=${encodeURIComponent(String(since))}`;
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Sync pull failed (${response.status}): ${body}`);
      }
      return (await readJson(response)) as PullResponse;
    },
  };
}
