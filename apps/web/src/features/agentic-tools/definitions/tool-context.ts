import type { AppDb } from "@/data-access-layer/event-sourced/collection";

export type ResumeWorkbenchTab = "edit" | "preview" | "json";

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
  navigateToResume: (resumeId: string, tab: ResumeWorkbenchTab) => void;
};

/** Request context for remote (Drizzle-backed) tool implementations. */
export type RemoteToolContext = {
  userId: string;
};
