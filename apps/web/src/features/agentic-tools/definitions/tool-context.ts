import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import type { WorkbenchTab } from "../resume-tool-schemas";

/**
 * One write tool call: the outbox transactions whose first event got a
 * `localSeq` in `[fromSeq, toSeq)`. That first seq is allocated synchronously
 * on write; later events of the same transaction may land after `toSeq`.
 */
export type AiChange = {
  tool: string;
  fromSeq: number;
  toSeq: number;
};

/**
 * Context for local (browser, TanStack DB) tool implementations, passed to `useChat({ context })`.
 * The active résumé is read through a getter because a tool may change it mid-run,
 * before React re-renders and hands the chat client a new context.
 */
export type LocalToolContext = {
  db: AppDb;
  userId: string;
  getActiveResumeId: () => string;
  setActiveResumeId: (resumeId: string) => void;
  /** Queues navigation until the current reply finishes, so the run is not cut off. */
  openResume: (resumeId: string, tab: WorkbenchTab) => void;
  /** Write tool calls this conversation, oldest first, for `undo_last_ai_change`. */
  changes: AiChange[];
};

/** Request context for remote (Drizzle-backed) tool implementations. */
export type RemoteToolContext = {
  userId: string;
};
