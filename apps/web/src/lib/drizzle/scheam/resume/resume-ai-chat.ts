import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
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
