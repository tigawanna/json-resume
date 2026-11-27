import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { embeddable, timestamps } from "./shared-columns.ts";

/** Footer copy: condensed cover letter, addendum, or other printed notes. */
export const resumeNote = pgTable(
  "resume_note",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** Section heading on the page, e.g. "Notes" or "Cover letter" */
    label: text("label").default("Notes").notNull(),
    text: text("text").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_note_userId_idx").on(table.userId)],
);
