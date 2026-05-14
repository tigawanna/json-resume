import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";

export const resumeSummary = sqliteTable(
  "resume_summary",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "cascade" }),
    text: text("text").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [
    index("resume_summary_userId_idx").on(table.userId),
    index("resume_summary_resumeId_idx").on(table.resumeId),
  ],
);

export const resumeSummaryItem = sqliteTable(
  "resume_summary_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    summaryId: text("summary_id")
      .notNull()
      .references(() => resumeSummary.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_summary_item_resumeId_idx").on(table.resumeId),
    index("resume_summary_item_summaryId_idx").on(table.summaryId),
    uniqueIndex("resume_summary_item_unique_idx").on(table.resumeId, table.summaryId),
  ],
);
