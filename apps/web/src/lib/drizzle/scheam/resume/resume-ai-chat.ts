import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "../auth-schema";
import { resume } from "./resume";
import { timestamps } from "./shared-columns";

export const resumeAiChat = sqliteTable(
  "resume_ai_chat",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    messages: text("messages").default("[]").notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_ai_chat_userId_idx").on(table.userId),
    index("resume_ai_chat_resumeId_idx").on(table.resumeId),
    uniqueIndex("resume_ai_chat_userId_resumeId_idx").on(table.userId, table.resumeId),
  ],
);

export const resumeAiConversation = sqliteTable(
  "resume_ai_conversation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    title: text("title"),
    model: text("model"),
    ...timestamps,
  },
  (table) => [
    index("resume_ai_conversation_userId_idx").on(table.userId),
    index("resume_ai_conversation_resumeId_idx").on(table.resumeId),
    index("resume_ai_conversation_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    uniqueIndex("resume_ai_conversation_userId_resumeId_idx").on(table.userId, table.resumeId),
  ],
);

export const resumeAiMessage = sqliteTable(
  "resume_ai_message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    messageId: text("message_id").notNull(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => resumeAiConversation.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["system", "user", "assistant"] }).notNull(),
    position: integer("position").notNull(),
    textContent: text("text_content").default("").notNull(),
    parts: text("parts").default("[]").notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_ai_message_conversationId_idx").on(table.conversationId),
    uniqueIndex("resume_ai_message_conversationId_position_idx").on(
      table.conversationId,
      table.position,
    ),
    uniqueIndex("resume_ai_message_conversationId_messageId_idx").on(
      table.conversationId,
      table.messageId,
    ),
  ],
);
