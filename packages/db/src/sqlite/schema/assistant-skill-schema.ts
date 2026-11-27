import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "@repo/db/sqlite/schema/auth-schema";
import { embeddable, timestamps } from "@repo/db/sqlite/schema/resume/shared-columns";

/** Which chats load a skill when it is marked as a default. */
export type AssistantSkillScope = "resume" | "experience" | "dashboard";

/**
 * Instructions the résumé assistants follow. Separate from résumé skill groups.
 * Synced with the rest of the library so the same skills show up on every device.
 */
export const assistantSkill = sqliteTable(
  "assistant_skill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").default("").notNull(),
    body: text("body").default("").notNull(),
    scopes: text("scopes", { mode: "json" }).$type<AssistantSkillScope[]>().notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    /** Stable key for a skill that ships with the app. Null when the user wrote it. */
    builtinKey: text("builtin_key"),
    ...embeddable,
    ...timestamps,
  },
  (table) => [
    index("assistant_skill_userId_idx").on(table.userId),
    index("assistant_skill_userId_updatedAt_idx").on(table.userId, table.updatedAt),
  ],
);

export const assistantSkillRelations = relations(assistantSkill, ({ one }) => ({
  user: one(user, {
    fields: [assistantSkill.userId],
    references: [user.id],
  }),
}));
