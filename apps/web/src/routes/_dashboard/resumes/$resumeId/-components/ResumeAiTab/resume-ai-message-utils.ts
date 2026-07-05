import type {
  JsonValue,
  ResumeAiChatMessage,
  ResumeAiChatMessagePart,
} from "@/data-access-layer/resume/ai-chat/ai-chat.types";
import {
  createdResumeToolNames,
  getCreatedResumeOutput,
  type CreatedResumeOutput,
} from "@/features/agentic-tools/created-resume-output";
import type { UIMessage } from "@tanstack/ai-react";
import type { ToolCallViewPart } from "./resume-ai-types";

export type { CreatedResumeOutput };
export { createdResumeToolNames, getCreatedResumeOutput };

export function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const items: JsonValue[] = [];
    for (const item of value) {
      const parsed = toJsonValue(item);
      if (parsed !== undefined) items.push(parsed);
    }
    return items;
  }

  if (typeof value === "object") {
    const record: { [key: string]: JsonValue } = {};
    for (const [key, item] of Object.entries(value)) {
      const parsed = toJsonValue(item);
      if (parsed !== undefined) record[key] = parsed;
    }
    return record;
  }

  return undefined;
}

function parseMaybeJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function formatPayload(value: unknown): string {
  if (typeof value === "string") {
    const parsed = parseMaybeJson(value);
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
  }

  const jsonValue = toJsonValue(value);
  if (jsonValue === undefined) return "";
  return typeof jsonValue === "string" ? jsonValue : JSON.stringify(jsonValue, null, 2);
}

function getJsonRecord(value: unknown): { [key: string]: JsonValue } | null {
  const jsonValue = toJsonValue(value);
  if (!jsonValue || typeof jsonValue !== "object" || Array.isArray(jsonValue)) return null;
  return jsonValue;
}

export function getToolOutputRecord(part: ToolCallViewPart): { [key: string]: JsonValue } | null {
  if (part.output !== undefined) return getJsonRecord(part.output);
  return null;
}

export function getToolLabel(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function toStoredMessages(messages: UIMessage[]): ResumeAiChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts
      .map((part): ResumeAiChatMessagePart | null => {
        if (part.type === "text") return { type: "text", content: part.content };
        if (part.type === "thinking") return { type: "thinking", content: part.content };

        if (part.type === "tool-call") {
          const output = toJsonValue(part.output);
          return {
            type: "tool-call",
            id: part.id,
            name: part.name,
            arguments: part.arguments,
            state: part.state,
            ...(part.approval === undefined ? {} : { approval: part.approval }),
            ...(output === undefined ? {} : { output }),
          };
        }

        if (part.type === "tool-result") {
          return {
            type: "tool-result",
            toolCallId: part.toolCallId,
            content: part.content,
            state: part.state,
            ...(part.error === undefined ? {} : { error: part.error }),
          };
        }

        return null;
      })
      .filter((part): part is ResumeAiChatMessagePart => part !== null),
  }));
}

export function toUiMessages(messages: ResumeAiChatMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts.map((part) => ({ ...part })),
  }));
}

export function getStoredMessagesSignature(messages: ResumeAiChatMessage[]) {
  return JSON.stringify(messages);
}

export function getUiMessagesSignature(messages: UIMessage[]) {
  return getStoredMessagesSignature(toStoredMessages(messages));
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join("\n")
    .trim();
}

export function getSessionChars(messages: UIMessage[]) {
  return messages.reduce((total, msg) => {
    const textChars = msg.parts
      .filter((part) => part.type === "text")
      .reduce((sum, part) => sum + (part.type === "text" ? part.content.length : 0), 0);
    return total + textChars;
  }, 0);
}
