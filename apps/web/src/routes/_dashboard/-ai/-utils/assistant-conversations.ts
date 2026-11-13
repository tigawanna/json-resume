export type AssistantStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type AssistantConversation = {
  id: string;
  routeKey: string;
  routeLabel: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
};

const MAX_CONVERSATIONS = 50;
const TITLE_LENGTH = 80;
const PREVIEW_LENGTH = 240;
const EXCERPT_MESSAGES = 12;

export function conversationIndexKey(userId: string) {
  return `assistant-conversations:${userId || "local"}`;
}

export function conversationStateKey(userId: string, conversationId: string) {
  return `assistant-conversation:${userId || "local"}:${conversationId}`;
}

export function legacyAssistantKey(userId: string) {
  return `dashboard-assistant:${userId || "local"}`;
}

export function conversationIdFromThread(threadId: string) {
  const prefix = "assistant:";
  return threadId.startsWith(prefix) ? threadId.slice(prefix.length) : threadId;
}

export function assistantThreadId(conversationId: string) {
  return `assistant:${conversationId}`;
}

/** Route id plus the row or experience group. Search and hash are ignored. */
export function assistantRouteKey(
  routeId: string,
  params: Record<string, string>,
  groupKey: string | null,
) {
  if (routeId === "/_dashboard/experiences/$experienceId/" && groupKey) {
    return `${routeId}group:${groupKey}`;
  }
  const bits = ["experienceId", "jobId", "coverLetterId", "skillId"]
    .filter((name) => params[name])
    .map((name) => `${name}=${params[name]}`);
  return bits.length > 0 ? `${routeId}?${bits.join("&")}` : routeId;
}

function readIndex(store: AssistantStore, userId: string): AssistantConversation[] {
  try {
    const raw = store.getItem(conversationIndexKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isConversation);
  } catch {
    return [];
  }
}

function writeIndex(store: AssistantStore, userId: string, conversations: AssistantConversation[]) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const kept = sorted.slice(0, MAX_CONVERSATIONS);
  const dropped = sorted.slice(MAX_CONVERSATIONS);
  for (const conversation of dropped) {
    store.removeItem(conversationStateKey(userId, conversation.id));
  }
  store.setItem(conversationIndexKey(userId), JSON.stringify(kept));
  return kept;
}

function isConversation(value: unknown): value is AssistantConversation {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.routeKey === "string" &&
    typeof row.routeLabel === "string" &&
    typeof row.title === "string" &&
    typeof row.createdAt === "number" &&
    typeof row.updatedAt === "number" &&
    typeof row.messageCount === "number"
  );
}

/** Moves the old single-thread blob into one conversation so it is not deleted. */
export function migrateLegacyConversation(store: AssistantStore, userId: string, now = Date.now()) {
  const legacy = store.getItem(legacyAssistantKey(userId));
  if (!legacy) return;
  const conversations = readIndex(store, userId);
  if (conversations.some((conversation) => conversation.routeKey === "legacy")) {
    store.removeItem(legacyAssistantKey(userId));
    return;
  }
  const id = `legacy-${now}`;
  const conversation: AssistantConversation = {
    id,
    routeKey: "legacy",
    routeLabel: "Earlier assistant",
    title: "Earlier assistant",
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  store.setItem(conversationStateKey(userId, id), legacy);
  writeIndex(store, userId, [conversation, ...conversations]);
  store.removeItem(legacyAssistantKey(userId));
}

export function loadConversations(store: AssistantStore, userId: string) {
  return readIndex(store, userId).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function newestForRoute(conversations: readonly AssistantConversation[], routeKey: string) {
  return conversations.find((conversation) => conversation.routeKey === routeKey) ?? null;
}

export function createConversation(
  store: AssistantStore,
  userId: string,
  input: { id: string; routeKey: string; routeLabel: string; now?: number },
) {
  const now = input.now ?? Date.now();
  const conversation: AssistantConversation = {
    id: input.id,
    routeKey: input.routeKey,
    routeLabel: input.routeLabel,
    title: input.routeLabel,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  writeIndex(store, userId, [conversation, ...readIndex(store, userId)]);
  return conversation;
}

export function touchConversation(
  store: AssistantStore,
  userId: string,
  id: string,
  patch: { title?: string; routeLabel?: string; messageCount?: number; now?: number },
) {
  const conversations = readIndex(store, userId);
  const current = conversations.find((conversation) => conversation.id === id);
  if (!current) return null;
  const next: AssistantConversation = {
    ...current,
    title: patch.title ?? current.title,
    routeLabel: patch.routeLabel ?? current.routeLabel,
    messageCount: patch.messageCount ?? current.messageCount,
    updatedAt: patch.now ?? Date.now(),
  };
  writeIndex(
    store,
    userId,
    conversations.map((conversation) => (conversation.id === id ? next : conversation)),
  );
  return next;
}

export function deleteConversation(store: AssistantStore, userId: string, id: string) {
  store.removeItem(conversationStateKey(userId, id));
  writeIndex(
    store,
    userId,
    readIndex(store, userId).filter((conversation) => conversation.id !== id),
  );
}

export function messageText(message: unknown) {
  if (!message || typeof message !== "object") return null;
  const row = message as { role?: unknown; content?: unknown; parts?: unknown };
  if (row.role !== "user" && row.role !== "assistant") return null;
  const parts = Array.isArray(row.parts) ? row.parts : [];
  const fromParts = parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const textPart = part as { type?: unknown; content?: unknown };
      return textPart.type === "text" && typeof textPart.content === "string"
        ? textPart.content
        : "";
    })
    .join("\n")
    .trim();
  const fromContent = typeof row.content === "string" ? row.content.trim() : "";
  const text = fromParts || fromContent;
  if (!text) return null;
  return { role: row.role, text };
}

function storedMessages(store: AssistantStore, userId: string, id: string): unknown[] {
  try {
    const raw = store.getItem(conversationStateKey(userId, id));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("messages" in parsed)) return [];
    const messages = (parsed as { messages: unknown }).messages;
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

function previewFor(messages: unknown[], keyword: string) {
  const texts = messages.flatMap((message) => {
    const text = messageText(message);
    return text ? [text.text] : [];
  });
  const haystack = texts.join("\n");
  const needle = keyword.trim().toLowerCase();
  if (needle) {
    const at = haystack.toLowerCase().indexOf(needle);
    if (at >= 0) {
      const start = Math.max(0, at - 40);
      return haystack.slice(start, start + PREVIEW_LENGTH);
    }
  }
  return (texts[0] ?? "").slice(0, PREVIEW_LENGTH);
}

export function searchAssistantConversations(
  store: AssistantStore,
  userId: string,
  input: { keyword?: string; routeKey?: string; limit?: number; conversationId?: string },
  activeConversationId: string,
) {
  if (input.conversationId) {
    if (input.conversationId === activeConversationId) {
      return { conversations: [], excerpt: [] };
    }
    const messages = storedMessages(store, userId, input.conversationId)
      .map(messageText)
      .filter((message): message is { role: string; text: string } => message !== null)
      .slice(-EXCERPT_MESSAGES);
    return { conversations: [], excerpt: messages };
  }

  const terms = (input.keyword ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const limit = input.limit ?? 10;
  const conversations = loadConversations(store, userId)
    .filter((conversation) => conversation.id !== activeConversationId)
    .filter((conversation) => !input.routeKey || conversation.routeKey === input.routeKey)
    .map((conversation) => {
      const messages = storedMessages(store, userId, conversation.id);
      return {
        conversation,
        messages,
        preview: previewFor(messages, input.keyword ?? ""),
      };
    })
    .filter((hit) => {
      if (terms.length === 0) return true;
      const haystack =
        `${hit.conversation.title}\n${hit.conversation.routeLabel}\n${hit.preview}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .slice(0, limit)
    .map((hit) => ({
      id: hit.conversation.id,
      title: hit.conversation.title,
      routeLabel: hit.conversation.routeLabel,
      routeKey: hit.conversation.routeKey,
      updatedAt: hit.conversation.updatedAt,
      preview: hit.preview,
    }));

  return { conversations };
}

export function firstUserTitle(messages: readonly unknown[]) {
  for (const message of messages) {
    const text = messageText(message);
    if (text?.role === "user") return text.text.replace(/\s+/g, " ").slice(0, TITLE_LENGTH);
  }
  return "";
}

export function formatConversationAge(updatedAt: number, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - updatedAt) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
