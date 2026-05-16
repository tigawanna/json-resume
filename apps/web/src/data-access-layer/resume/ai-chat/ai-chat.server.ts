import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeAiChat, resumeAiConversation, resumeAiMessage } from "@/lib/drizzle/scheam";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { JsonValue, ResumeAiChatDTO, ResumeAiChatMessage } from "./ai-chat.types";

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const messagePartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string(),
    metadata: jsonValueSchema.optional(),
  }),
  z.object({
    type: z.literal("thinking"),
    content: z.string(),
  }),
  z.object({
    type: z.literal("tool-call"),
    id: z.string(),
    name: z.string(),
    arguments: z.string(),
    state: z.enum([
      "awaiting-input",
      "input-streaming",
      "input-complete",
      "approval-requested",
      "approval-responded",
    ]),
    approval: z
      .object({
        id: z.string(),
        needsApproval: z.boolean(),
        approved: z.boolean().optional(),
      })
      .optional(),
    output: jsonValueSchema.optional(),
  }),
  z.object({
    type: z.literal("tool-result"),
    toolCallId: z.string(),
    content: z.string(),
    state: z.enum(["streaming", "complete", "error"]),
    error: z.string().optional(),
  }),
]);

const messagePartsSchema = z.array(messagePartSchema);

const resumeAiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  parts: messagePartsSchema,
});

const resumeAiMessagesSchema = z.array(resumeAiMessageSchema);

function parseStoredMessages(raw: string): ResumeAiChatDTO["messages"] {
  const parsed: unknown = JSON.parse(raw);
  return resumeAiMessagesSchema.parse(parsed);
}

function parseStoredMessageParts(raw: string): ResumeAiChatMessage["parts"] {
  const parsed: unknown = JSON.parse(raw);
  return messagePartsSchema.parse(parsed);
}

function serializeMessageParts(parts: ResumeAiChatMessage["parts"]): string {
  return JSON.stringify(messagePartsSchema.parse(parts));
}

function getMessageTextContent(message: ResumeAiChatMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join("\n")
    .trim();
}

function toDTO(
  conversation: typeof resumeAiConversation.$inferSelect,
  messages: ResumeAiChatDTO["messages"],
): ResumeAiChatDTO {
  return {
    id: conversation.id,
    resumeId: conversation.resumeId,
    messages,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

async function getConversationForUser(resumeId: string, userId: string) {
  const rows = await db
    .select()
    .from(resumeAiConversation)
    .innerJoin(resume, eq(resumeAiConversation.resumeId, resume.id))
    .where(
      and(eq(resumeAiConversation.resumeId, resumeId), eq(resumeAiConversation.userId, userId)),
    )
    .limit(1);

  return rows[0]?.resume_ai_conversation ?? null;
}

async function getMessagesForConversation(
  conversationId: string,
): Promise<ResumeAiChatDTO["messages"]> {
  const rows = await db
    .select()
    .from(resumeAiMessage)
    .where(eq(resumeAiMessage.conversationId, conversationId))
    .orderBy(asc(resumeAiMessage.position), asc(resumeAiMessage.createdAt));

  return rows.map((row) => ({
    id: row.messageId,
    role: row.role,
    parts: parseStoredMessageParts(row.parts),
  }));
}

async function getLegacyResumeAiChatForUser(
  resumeId: string,
  userId: string,
): Promise<ResumeAiChatDTO | null> {
  const rows = await db
    .select()
    .from(resumeAiChat)
    .innerJoin(resume, eq(resumeAiChat.resumeId, resume.id))
    .where(and(eq(resumeAiChat.resumeId, resumeId), eq(resumeAiChat.userId, userId)))
    .limit(1);

  const legacy = rows[0]?.resume_ai_chat;
  if (!legacy) return null;

  return {
    id: legacy.id,
    resumeId: legacy.resumeId,
    messages: parseStoredMessages(legacy.messages),
    createdAt: legacy.createdAt.toISOString(),
    updatedAt: legacy.updatedAt.toISOString(),
  };
}

export async function getResumeAiChatForUser(
  resumeId: string,
  userId: string,
): Promise<ResumeAiChatDTO | null> {
  const conversation = await getConversationForUser(resumeId, userId);

  if (conversation) {
    return toDTO(conversation, await getMessagesForConversation(conversation.id));
  }

  const legacy = await getLegacyResumeAiChatForUser(resumeId, userId);
  if (!legacy) return null;

  return saveResumeAiChatForUser(resumeId, userId, legacy.messages);
}

export async function saveResumeAiChatForUser(
  resumeId: string,
  userId: string,
  messages: ResumeAiChatDTO["messages"],
  options: { model?: string } = {},
): Promise<ResumeAiChatDTO> {
  const storedMessages = resumeAiMessagesSchema.parse(messages);
  const existing = await getConversationForUser(resumeId, userId);
  const conversationId = existing?.id ?? crypto.randomUUID();
  const title = getMessageTextContent(
    storedMessages[0] ?? { id: "", role: "user", parts: [] },
  ).slice(0, 120);

  await db.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(resumeAiConversation)
        .set({
          title: existing.title ?? title,
          model: options.model ?? existing.model,
        })
        .where(eq(resumeAiConversation.id, conversationId));
    } else {
      await tx.insert(resumeAiConversation).values({
        id: conversationId,
        userId,
        resumeId,
        title,
        model: options.model,
      });
    }

    await tx.delete(resumeAiMessage).where(eq(resumeAiMessage.conversationId, conversationId));

    if (storedMessages.length > 0) {
      await tx.insert(resumeAiMessage).values(
        storedMessages.map((message, position) => ({
          messageId: message.id,
          conversationId,
          role: message.role,
          position,
          textContent: getMessageTextContent(message),
          parts: serializeMessageParts(message.parts),
        })),
      );
    }
  });

  const conversation = await getConversationForUser(resumeId, userId);
  if (!conversation) throw new Error("Conversation was not saved");

  return toDTO(conversation, await getMessagesForConversation(conversation.id));
}

export async function clearResumeAiChatForUser(resumeId: string, userId: string): Promise<void> {
  const conversation = await getConversationForUser(resumeId, userId);
  if (conversation) {
    await db.delete(resumeAiConversation).where(eq(resumeAiConversation.id, conversation.id));
  }
  await db
    .delete(resumeAiChat)
    .where(and(eq(resumeAiChat.resumeId, resumeId), eq(resumeAiChat.userId, userId)));
}
