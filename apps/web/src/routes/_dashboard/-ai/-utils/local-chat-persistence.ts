import type { AnyClientTool } from "@tanstack/ai";
import type { ChatClientPersistence, ChatPersistedState } from "@tanstack/ai-client";
import { Debouncer } from "@tanstack/react-pacer";
import { parseStoredMessages } from "./event-sourced-chat-persistence";

const PERSIST_DEBOUNCE_MS = 500;

export type LocalChatPersistence<TTools extends ReadonlyArray<AnyClientTool>> =
  ChatClientPersistence<TTools> & {
    /** Writes the pending state now. Call when a run settles, on `pagehide`, and on unmount. */
    flush: () => void;
  };

/** A chat kept in this browser's localStorage, typed by its tools so `useChat` still infers them. */
export function createLocalChatPersistence<TTools extends ReadonlyArray<AnyClientTool>>(
  getKey: () => string,
  options?: { keyForThread?: (threadId: string) => string },
): LocalChatPersistence<TTools> {
  let pending: { key: string; state: ChatPersistedState<TTools> } | null = null;

  function writePending() {
    if (pending === null) return;
    const { key, state } = pending;
    pending = null;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the conversation still works, it just won't survive a reload.
    }
  }

  const debouncer = new Debouncer(writePending, {
    wait: PERSIST_DEBOUNCE_MS,
    key: "dashboard-assistant-persistence",
  });

  function keyFor(threadId: string) {
    return options?.keyForThread ? options.keyForThread(threadId) : getKey();
  }

  return {
    flush() {
      debouncer.cancel();
      writePending();
    },
    getItem(threadId) {
      const key = keyFor(threadId);
      if (pending !== null && pending.key === key) return pending.state;
      try {
        const raw = localStorage.getItem(key);
        return raw ? parseStoredMessages<TTools>(raw) : null;
      } catch {
        return null;
      }
    },
    setItem(threadId, state) {
      pending = { key: keyFor(threadId), state };
      debouncer.maybeExecute();
    },
    removeItem(threadId) {
      const key = keyFor(threadId);
      debouncer.cancel();
      if (pending?.key === key) pending = null;
      try {
        localStorage.removeItem(key);
      } catch {
        // Nothing stored to remove.
      }
    },
  };
}
