import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { embeddable, timestamps } from "./shared-columns";

export const resumeTalk = sqliteTable(
  "resume_talk",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    event: text("event").default("").notNull(),
    date: text("date").default("").notNull(),
    description: text("description").default("").notNull(),
    /** JSON array of {label, url} objects */
    links: text("links").default("[]").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_talk_userId_idx").on(table.userId)],
);
