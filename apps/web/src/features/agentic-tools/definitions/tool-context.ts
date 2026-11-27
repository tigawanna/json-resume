import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import type { WorkbenchTab } from "@repo/isomorphic/agentic/tool-schemas/resume/lifecycle";

/**
 * One write tool call: the outbox transactions whose first event got a
 * `localSeq` in `[fromSeq, toSeq)`. That first seq is allocated synchronously
 * on write; later events of the same transaction may land after `toSeq`.
 */
export type AiChangeRow = {
  collectionId: string;
  key: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

export type AiChange = {
  tool: string;
  fromSeq: number;
  toSeq: number;
  /** Rows whose state changed during this tool call, for compaction-safe undo. */
  touched: AiChangeRow[];
};

/**
 * Context for local (browser, TanStack DB) tool implementations, passed to `useChat({ context })`.
 * The active résumé is read through a getter because a tool may change it mid-run,
 * before React re-renders and hands the chat client a new context.
 */
export type LocalToolContext = {
  db: AppDb;
  userId: string;
  /** Null when the user detached the résumé from the conversation. */
  getActiveResumeId: () => string | null;
  setActiveResumeId: (resumeId: string) => void;
  /** Queues navigation until the current reply finishes, so the run is not cut off. */
  openResume: (resumeId: string, tab: WorkbenchTab) => void;
  /** Write tool calls this conversation, oldest first, for `undo_last_ai_change`. */
  changes: AiChange[];
};

/** What the dashboard assistant hands to the résumé editor's assistant. */
export type ResumeHandoff = {
  resumeId: string;
  name: string;
  mode: "reuse" | "copy" | "create";
  baseResumeName: string;
  jobLabel: string;
  jobAttached: boolean;
  reason: string;
  suggestedPrompt: string;
};

/** Which page pack is live. Tools outside it are not sent to the model. */
export type PageToolPack =
  | "library"
  | "experience"
  | "job"
  | "resume-list"
  | "cover-letter"
  | "none";

/** The dashboard assistant has no active résumé; it opens one through `handOff`. */
export type DashboardToolContext = LocalToolContext & {
  /** Queues the handoff until the current reply finishes, so the run is not cut off. */
  handOff: (handoff: ResumeHandoff) => void;
  /** Title ids in the open experience group. Empty off that page. */
  getGroupTitleIds: () => string[];
  /** The conversation currently on screen. History search skips it. */
  getActiveConversationId: () => string;
  getToolPack: () => PageToolPack;
};

/** Request context for remote (Drizzle-backed) tool implementations. */
export type RemoteToolContext = {
  userId: string;
};
