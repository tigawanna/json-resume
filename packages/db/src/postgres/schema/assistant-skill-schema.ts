import { relations } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { user } from "./auth-schema.ts";
import { embeddable, timestamps } from "./resume/shared-columns.ts";

/** Which chats load a skill when it is marked as a default. */
export type AssistantSkillScope = "resume" | "experience" | "dashboard";

/**
 * Instructions the résumé assistants follow. Separate from résumé skill groups.
 * Synced with the rest of the library so the same skills show up on every device.
 */
export const assistantSkill = pgTable(
  "assistant_skill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").default("").notNull(),
    body: text("body").default("").notNull(),
    scopes: jsonb("scopes").$type<AssistantSkillScope[]>().notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
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
