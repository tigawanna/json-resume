import { aiEventClient } from "@tanstack/ai-event-client";
import { AI_DEVTOOLS_CLIENT_EVENTS } from "./ai-devtools-events";

const FLUSH_MS = 2_000;
const ENDPOINT = "/api/dev/ai-devtools-log";

export type ClientLogRecord = {
  source: "client" | "fps";
  type: string;
  at: number;
  event: unknown;
};

type Activity = { type: string; at: number };

let pending: ClientLogRecord[] = [];
let started = false;
let activity: Activity | null = null;

export function latestAiActivity(): Activity | null {
  return activity;
}

export function enqueueClientLog(record: ClientLogRecord) {
  pending.push(record);
}

function flush() {
  if (pending.length === 0) return;
  const records = pending.splice(0, 200);
  const body = JSON.stringify({ records });
  const blob = new Blob([body], { type: "application/json" });
  if (navigator.sendBeacon(ENDPOINT, blob)) return;
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

/** Buffers browser AI events and FPS samples, then posts them on the same clock. */
export function startAiDevtoolsClientLog() {
  if (started || !import.meta.env.DEV) return;
  started = true;

  for (const type of AI_DEVTOOLS_CLIENT_EVENTS) {
    aiEventClient.on(
      type,
      (event) => {
        const at = Date.now();
        activity = { type: event.type, at };
        pending.push({ source: "client", type: event.type, at, event });
      },
      { withEventTarget: true },
    );
  }

  window.setInterval(flush, FLUSH_MS);
  window.addEventListener("pagehide", flush);
}
