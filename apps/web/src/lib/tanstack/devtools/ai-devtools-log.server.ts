import "@tanstack/react-start/server-only";

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { aiEventClient } from "@tanstack/ai-event-client";
import { AI_DEVTOOLS_SERVER_EVENTS } from "./ai-devtools-events";

const LOG_DIR = join(process.cwd(), ".evlog", "ai-devtools");

export type AiDevtoolsLogRecord = {
  source: "server" | "client" | "fps";
  type: string;
  at: number;
  event: unknown;
};

let writeTail: Promise<void> = Promise.resolve();
let listening = false;

function logFile() {
  const day = new Date().toISOString().slice(0, 10);
  return join(LOG_DIR, `${day}.ndjson`);
}

export function appendAiDevtoolsRecords(records: AiDevtoolsLogRecord[]) {
  if (!import.meta.env.DEV || records.length === 0) return;
  const lines = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  writeTail = writeTail
    .then(async () => {
      await mkdir(LOG_DIR, { recursive: true });
      await appendFile(logFile(), lines);
    })
    .catch((error: unknown) => {
      console.error("Failed to write AI devtools log", error);
    });
}

/** Subscribes once, in the same process as `chat()`, so a closed tab cannot drop the run. */
export function startAiDevtoolsLog() {
  if (!import.meta.env.DEV || listening) return;
  listening = true;
  for (const type of AI_DEVTOOLS_SERVER_EVENTS) {
    aiEventClient.on(
      type,
      (event) => {
        appendAiDevtoolsRecords([{ source: "server", type: event.type, at: Date.now(), event }]);
      },
      { withEventTarget: true },
    );
  }
}

startAiDevtoolsLog();
