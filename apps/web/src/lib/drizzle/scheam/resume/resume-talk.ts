import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";

export const resumeTalk = sqliteTable(
  "resume_talk",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "cascade" }),
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
  (table) => [
    index("resume_talk_userId_idx").on(table.userId),
    index("resume_talk_resumeId_idx").on(table.resumeId),
  ],
);

export const resumeTalkItem = sqliteTable(
  "resume_talk_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    talkId: text("talk_id")
      .notNull()
      .references(() => resumeTalk.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_talk_item_resumeId_idx").on(table.resumeId),
    index("resume_talk_item_talkId_idx").on(table.talkId),
    uniqueIndex("resume_talk_item_unique_idx").on(table.resumeId, table.talkId),
  ],
);
