// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";
import {
  assistantThreadId,
  conversationStateKey,
  createConversation,
  migrateLegacyConversation,
  searchAssistantConversations,
  type AssistantStore,
} from "./assistant-conversations";
import { createLocalChatPersistence } from "./local-chat-persistence";

function memoryStore(
  seed: Record<string, string> = {},
): AssistantStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("assistant conversations", () => {
  it("searches other threads and can excerpt one of them", () => {
    const store = memoryStore();
    const notes = createConversation(store, "u1", {
      id: "notes",
      routeKey: "/notes",
      routeLabel: "Notes",
      now: 3,
    });
    const jobs = createConversation(store, "u1", {
      id: "jobs",
      routeKey: "/jobs",
      routeLabel: "Jobs",
      now: 2,
    });
    const experience = createConversation(store, "u1", {
      id: "experience",
      routeKey: "/experience",
      routeLabel: "Experience",
      now: 1,
    });
    store.setItem(
      conversationStateKey("u1", notes.id),
      JSON.stringify({
        messages: [
          { role: "user", parts: [{ type: "text", content: "Remember the billing rewrite" }] },
        ],
      }),
    );
    store.setItem(
      conversationStateKey("u1", jobs.id),
      JSON.stringify({
        messages: [
          { role: "user", parts: [{ type: "text", content: "The Acme role is in Austin" }] },
        ],
      }),
    );
    store.setItem(
      conversationStateKey("u1", experience.id),
      JSON.stringify({
        messages: Array.from({ length: 20 }, (_, index) => ({
          role: index % 2 === 0 ? "user" : "assistant",
          parts: [{ type: "text", content: `line ${index}` }],
        })),
      }),
    );

    const hits = searchAssistantConversations(store, "u1", { keyword: "billing" }, "experience");
    expect(hits.conversations.map((conversation) => conversation.id)).toEqual(["notes"]);
    expect(hits.conversations[0]?.preview).toContain("billing");

    const byRoute = searchAssistantConversations(store, "u1", { routeKey: "/jobs" }, "experience");
    expect(byRoute.conversations.map((conversation) => conversation.id)).toEqual(["jobs"]);

    const excerpt = searchAssistantConversations(
      store,
      "u1",
      { conversationId: "experience" },
      "notes",
    );
    expect(excerpt.excerpt).toHaveLength(12);
    expect(excerpt.excerpt?.[0]?.text).toBe("line 8");

    const active = searchAssistantConversations(store, "u1", { keyword: "billing" }, "notes");
    expect(active.conversations).toEqual([]);
  });

  it("keeps the previous single thread when the index is introduced", () => {
    const store = memoryStore({
      "dashboard-assistant:u1": JSON.stringify({
        messages: [{ role: "user", parts: [{ type: "text", content: "old thread" }] }],
      }),
    });
    migrateLegacyConversation(store, "u1", 10);
    expect(store.getItem("dashboard-assistant:u1")).toBeNull();
    const legacy = searchAssistantConversations(store, "u1", {}, "other");
    expect(legacy.conversations[0]?.routeKey).toBe("legacy");
  });

  it("reloads only the thread id it is asked for", () => {
    const store = memoryStore();
    const persistence = createLocalChatPersistence(() => "unused", {
      keyForThread: (threadId) => conversationStateKey("u1", threadId.replace("assistant:", "")),
    });
    const original = globalThis.localStorage;
    globalThis.localStorage = store as unknown as Storage;
    void persistence.setItem(assistantThreadId("one"), {
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", content: "one" }] }],
    });
    persistence.flush();
    void persistence.setItem(assistantThreadId("two"), {
      messages: [{ id: "m2", role: "user", parts: [{ type: "text", content: "two" }] }],
    });
    persistence.flush();
    const first = persistence.getItem(assistantThreadId("one"));
    const second = persistence.getItem(assistantThreadId("two"));
    if (first instanceof Promise || second instanceof Promise) {
      throw new Error("expected synchronous persistence");
    }
    expect(first?.messages).toHaveLength(1);
    expect(JSON.stringify(first)).toContain("one");
    expect(JSON.stringify(second)).toContain("two");
    expect(JSON.stringify(first)).not.toContain("two");
    globalThis.localStorage = original;
  });
});
