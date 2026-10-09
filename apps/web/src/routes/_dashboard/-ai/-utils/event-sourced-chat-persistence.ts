import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import type { AnyClientTool } from "@tanstack/ai";
import type { ChatClientPersistence, ChatPersistedState } from "@tanstack/ai-client";
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

function parseStoredMessages<TTools extends ClientTools>(
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

/** Typed by the chat's tools so `useChat` can still infer them (an untyped adapter widens them to `any`). */
export function createEventSourcedChatPersistence<TTools extends ClientTools>(options: {
  getDb: () => AppDb;
  getUserId: () => string;
  resumeId: string;
}): ChatClientPersistence<TTools> {
  const { resumeId } = options;

  return {
    getItem() {
      const row = options.getDb().collections.resumeAiChat.get(resumeId);
      if (!row) return null;
      return parseStoredMessages<TTools>(row.messages);
    },
    setItem(_id, state) {
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
    },
    removeItem() {
      const db = options.getDb();
      if (db.collections.resumeAiChat.has(resumeId)) {
        db.collections.resumeAiChat.delete(resumeId);
      }
    },
  };
}
