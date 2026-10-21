import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import type { AnyClientTool } from "@tanstack/ai";
import type { ChatClientPersistence, ChatPersistedState } from "@tanstack/ai-client";
import { Debouncer } from "@tanstack/react-pacer";
import { nowMs } from "../../-utils/row-helpers";

type ClientTools = ReadonlyArray<AnyClientTool>;

function isPersistedState<TTools extends ClientTools>(
  value: unknown,
): value is ChatPersistedState<TTools> {
  return (
    typeof value === "object" &&
    value !== null &&
    "messages" in value &&
    Array.isArray((value as { messages: unknown }).messages)
  );
}

export function parseStoredMessages<TTools extends ClientTools>(
  raw: string,
): ChatPersistedState<TTools> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return { messages: parsed };
    return isPersistedState<TTools>(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Carries a conversation over to another résumé's chat, unless that résumé already has one. */
export function handOverChatMessages(
  db: AppDb,
  userId: string,
  toResumeId: string,
  messages: ReadonlyArray<unknown>,
) {
  if (!userId || messages.length === 0) return;
  const existing = db.collections.resumeAiChat.get(toResumeId);
  if (existing && (parseStoredMessages(existing.messages)?.messages.length ?? 0) > 0) return;
  const payload = JSON.stringify({ messages });
  const ts = nowMs();
  if (existing) {
    db.collections.resumeAiChat.update(toResumeId, (draft) => {
      draft.messages = payload;
      draft.updatedAt = ts;
    });
    return;
  }
  db.collections.resumeAiChat.insert({
    id: toResumeId,
    userId,
    resumeId: toResumeId,
    messages: payload,
    createdAt: ts,
    updatedAt: ts,
  });
}

/**
 * Adds messages to the end of a résumé's chat, creating it when missing. Drops any
 * paused run, since the appended messages come after it. `replaceTrailing` drops
 * matching messages at the end first, so repeated markers do not stack.
 */
export function appendChatMessages(
  db: AppDb,
  userId: string,
  resumeId: string,
  messages: ReadonlyArray<unknown>,
  options: { replaceTrailing?: (message: unknown) => boolean } = {},
) {
  if (!userId || messages.length === 0) return;
  const existing = db.collections.resumeAiChat.get(resumeId);
  const previous: unknown[] = existing
    ? [...(parseStoredMessages(existing.messages)?.messages ?? [])]
    : [];
  while (previous.length > 0 && options.replaceTrailing?.(previous.at(-1))) previous.pop();
  const payload = JSON.stringify({ messages: [...previous, ...messages] });
  const ts = nowMs();
  if (existing) {
    db.collections.resumeAiChat.update(resumeId, (draft) => {
      draft.messages = payload;
      draft.updatedAt = ts;
    });
    return;
  }
  db.collections.resumeAiChat.insert({
    id: resumeId,
    userId,
    resumeId,
    messages: payload,
    createdAt: ts,
    updatedAt: ts,
  });
}

/** The chat client calls `setItem` on every streamed change; writes wait this long for the stream to go quiet. */
const PERSIST_DEBOUNCE_MS = 500;

export type EventSourcedChatPersistence<TTools extends ClientTools> =
  ChatClientPersistence<TTools> & {
    /** Writes the pending state now. Call when a run settles, on `pagehide`, and on unmount. */
    flush: () => void;
  };

/** Typed by the chat's tools so `useChat` can still infer them (an untyped adapter widens them to `any`). */
export function createEventSourcedChatPersistence<TTools extends ClientTools>(options: {
  getDb: () => AppDb;
  getUserId: () => string;
  resumeId: string;
}): EventSourcedChatPersistence<TTools> {
  const { resumeId } = options;
  let pending: ChatPersistedState<TTools> | null = null;

  function write(state: ChatPersistedState<TTools>) {
    const db = options.getDb();
    const userId = options.getUserId();
    if (!userId) return;
    const payload = JSON.stringify(state);
    const ts = nowMs();
    if (db.collections.resumeAiChat.has(resumeId)) {
      db.collections.resumeAiChat.update(resumeId, (draft) => {
        draft.messages = payload;
        draft.userId = userId;
        draft.updatedAt = ts;
      });
      return;
    }
    db.collections.resumeAiChat.insert({
      id: resumeId,
      userId,
      resumeId,
      messages: payload,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  function writePending() {
    if (pending === null) return;
    const state = pending;
    pending = null;
    write(state);
  }

  const debouncer = new Debouncer(writePending, {
    wait: PERSIST_DEBOUNCE_MS,
    key: `chat-persistence:${resumeId}`,
  });

  return {
    flush() {
      debouncer.cancel();
      writePending();
    },
    getItem() {
      if (pending !== null) return pending;
      const row = options.getDb().collections.resumeAiChat.get(resumeId);
      if (!row) return null;
      return parseStoredMessages<TTools>(row.messages);
    },
    setItem(_id, state) {
      pending = state;
      debouncer.maybeExecute();
    },
    removeItem() {
      debouncer.cancel();
      pending = null;
      const db = options.getDb();
      if (db.collections.resumeAiChat.has(resumeId)) {
        db.collections.resumeAiChat.delete(resumeId);
      }
    },
  };
}
