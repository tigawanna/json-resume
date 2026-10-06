import { SyncPushError } from "event-sourced-collection";
import type {
  PullResponse,
  PushConfirmation,
  PushFailure,
  PushResponse,
  SyncTransport,
} from "event-sourced-collection";
import {
  beginDownloadPage,
  noteDownloadPage,
  noteUploadChunk,
  noteUploaded,
} from "./sync-progress";

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

function readPullProgress(value: unknown): { count: number; hasMore: boolean } | null {
  if (value == null || typeof value !== "object" || !("events" in value)) return null;
  if (!Array.isArray(value.events)) return null;
  const hasMore = "hasMore" in value && value.hasMore === true;
  return { count: value.events.length, hasMore };
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
 *
 * One call is one request: the library sizes each batch (`syncPreset`) and
 * splits it further on HTTP 413, which it detects via `SyncPushError.status`.
 */
export function createCookieSyncTransport(): SyncTransport {
  return {
    async push(events) {
      const body = JSON.stringify(events);
      noteUploadChunk(events.length, new TextEncoder().encode(body).length);
      const response = await fetch(SYNC_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) {
        const text = await response.text();
        console.warn("[sync push] request failed", {
          status: response.status,
          events: events.length,
          bytes: body.length,
        });
        throw new SyncPushError(response.status, text);
      }
      const result = parsePushResponse(await readJson(response));
      noteUploaded(result.confirmed.length + (result.failed?.length ?? 0));
      return result;
    },
    async pull(since) {
      beginDownloadPage();
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
      const body = await readJson(response);
      const page = readPullProgress(body);
      if (page) noteDownloadPage(page.count, page.hasMore);
      return body as PullResponse;
    },
  };
}
