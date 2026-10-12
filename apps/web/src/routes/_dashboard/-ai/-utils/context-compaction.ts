import { z } from "zod";

const startedSchema = z.object({
  before: z.number(),
  messagesBefore: z.number(),
  maxTokens: z.number(),
});

const endedSchema = z.object({
  after: z.number(),
  messagesAfter: z.number(),
  maxTokens: z.number(),
});

export type ContextCompaction = {
  /** Estimated tokens of the history before and after compaction. */
  before: number;
  after: number;
  messagesBefore: number;
  messagesAfter: number;
  maxTokens: number;
  /** Which send this compaction belongs to, so the UI only flags the current turn. */
  turn: number;
};

export type ContextCompactionState = {
  /** A compaction that started and has not ended yet. */
  running: { before: number; messagesBefore: number; turn: number } | null;
  /** The latest compaction that actually shrank the history. */
  last: ContextCompaction | null;
};

export const INITIAL_CONTEXT_COMPACTION: ContextCompactionState = { running: null, last: null };

/**
 * Folds a `compaction:*` stream event into the state, or returns it unchanged
 * for unrelated events. `compaction:state` adds nothing `ended` lacks.
 */
export function reduceContextCompaction(
  state: ContextCompactionState,
  eventType: string,
  data: unknown,
  turn: number,
): ContextCompactionState {
  if (eventType === "compaction:started") {
    const started = startedSchema.safeParse(data);
    if (!started.success) return state;
    return {
      ...state,
      running: { before: started.data.before, messagesBefore: started.data.messagesBefore, turn },
    };
  }
  if (eventType === "compaction:ended") {
    const ended = endedSchema.safeParse(data);
    const { running } = state;
    if (!ended.success || !running) return state;
    // The strategy could not shrink anything (e.g. one message is over budget).
    if (ended.data.after >= running.before) return { ...state, running: null };
    return {
      running: null,
      last: {
        before: running.before,
        after: ended.data.after,
        messagesBefore: running.messagesBefore,
        messagesAfter: ended.data.messagesAfter,
        maxTokens: ended.data.maxTokens,
        turn: running.turn,
      },
    };
  }
  return state;
}

export function formatApproxTokens(tokens: number): string {
  if (tokens >= 1_000) return `~${(tokens / 1_000).toFixed(1)}k`;
  return `~${tokens}`;
}
