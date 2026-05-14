import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";

export const resumeLanguage = sqliteTable(
  "resume_language",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** e.g. "native", "fluent", "professional", "conversational", "basic" */
    proficiency: text("proficiency").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [
    index("resume_language_userId_idx").on(table.userId),
    index("resume_language_resumeId_idx").on(table.resumeId),
  ],
);

export const resumeLanguageItem = sqliteTable(
  "resume_language_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    languageId: text("language_id")
      .notNull()
      .references(() => resumeLanguage.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_language_item_resumeId_idx").on(table.resumeId),
    index("resume_language_item_languageId_idx").on(table.languageId),
    uniqueIndex("resume_language_item_unique_idx").on(table.resumeId, table.languageId),
  ],
);
