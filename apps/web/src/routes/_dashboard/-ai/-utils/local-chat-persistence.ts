import type { AnyClientTool } from "@tanstack/ai";
import type { ChatClientPersistence } from "@tanstack/ai-client";
import { parseStoredMessages } from "./event-sourced-chat-persistence";

/** A chat kept in this browser's localStorage, typed by its tools so `useChat` still infers them. */
export function createLocalChatPersistence<TTools extends ReadonlyArray<AnyClientTool>>(
  getKey: () => string,
): ChatClientPersistence<TTools> {
  return {
    getItem() {
      try {
        const raw = localStorage.getItem(getKey());
        return raw ? parseStoredMessages<TTools>(raw) : null;
      } catch {
        return null;
      }
    },
    setItem(_id, state) {
      try {
        localStorage.setItem(getKey(), JSON.stringify(state));
      } catch {
        // Storage full or blocked: the conversation still works, it just won't survive a reload.
      }
    },
    removeItem() {
      try {
        localStorage.removeItem(getKey());
      } catch {
        // Nothing stored to remove.
      }
    },
  };
}
