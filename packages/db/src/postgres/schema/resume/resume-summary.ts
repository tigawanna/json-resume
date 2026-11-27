import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { embeddable, timestamps } from "./shared-columns.ts";

export const resumeSummary = pgTable(
  "resume_summary",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    text: text("text").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_summary_userId_idx").on(table.userId)],
);
