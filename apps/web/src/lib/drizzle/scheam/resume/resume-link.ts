import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";
import { uuidv7 } from "uuidv7";

export const resumeLink = sqliteTable(
  "resume_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    label: text("label").notNull(),
    url: text("url").notNull(),
    /** Optional icon hint (e.g. "github", "linkedin", "globe") */
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_link_userId_idx").on(table.userId)],
);

export const resumeLinkItem = sqliteTable(
  "resume_link_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    linkId: text("link_id")
      .notNull()
      .references(() => resumeLink.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_link_item_resumeId_idx").on(table.resumeId),
    index("resume_link_item_linkId_idx").on(table.linkId),
    uniqueIndex("resume_link_item_unique_idx").on(table.resumeId, table.linkId),
  ],
);
