import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeAiChat } from "@/lib/drizzle/scheam";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { JsonValue, ResumeAiChatDTO } from "./ai-chat.types";

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

const resumeAiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(messagePartSchema),
});

const resumeAiMessagesSchema = z.array(resumeAiMessageSchema);

function parseStoredMessages(raw: string): ResumeAiChatDTO["messages"] {
  const parsed: unknown = JSON.parse(raw);
  return resumeAiMessagesSchema.parse(parsed);
}

function serializeMessages(messages: ResumeAiChatDTO["messages"]): string {
  return JSON.stringify(resumeAiMessagesSchema.parse(messages));
}

function toDTO(row: typeof resumeAiChat.$inferSelect): ResumeAiChatDTO {
  return {
    id: row.id,
    resumeId: row.resumeId,
    messages: parseStoredMessages(row.messages),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getResumeAiChatForUser(
  resumeId: string,
  userId: string,
): Promise<ResumeAiChatDTO | null> {
  const row = await db
    .select({
      id: resumeAiChat.id,
      userId: resumeAiChat.userId,
      resumeId: resumeAiChat.resumeId,
      messages: resumeAiChat.messages,
      createdAt: resumeAiChat.createdAt,
      updatedAt: resumeAiChat.updatedAt,
    })
    .from(resumeAiChat)
    .innerJoin(resume, eq(resumeAiChat.resumeId, resume.id))
    .where(and(eq(resumeAiChat.resumeId, resumeId), eq(resumeAiChat.userId, userId)))
    .limit(1);

  return row[0] ? toDTO(row[0]) : null;
}

export async function saveResumeAiChatForUser(
  resumeId: string,
  userId: string,
  messages: ResumeAiChatDTO["messages"],
): Promise<ResumeAiChatDTO> {
  const storedMessages = serializeMessages(messages);
  const existing = await getResumeAiChatForUser(resumeId, userId);

  if (existing) {
    const rows = await db
      .update(resumeAiChat)
      .set({ messages: storedMessages })
      .where(and(eq(resumeAiChat.resumeId, resumeId), eq(resumeAiChat.userId, userId)))
      .returning();

    return toDTO(rows[0]!);
  }

  const rows = await db
    .insert(resumeAiChat)
    .values({ userId, resumeId, messages: storedMessages })
    .returning();

  return toDTO(rows[0]!);
}

export async function clearResumeAiChatForUser(resumeId: string, userId: string): Promise<void> {
  await db
    .delete(resumeAiChat)
    .where(and(eq(resumeAiChat.resumeId, resumeId), eq(resumeAiChat.userId, userId)));
}
