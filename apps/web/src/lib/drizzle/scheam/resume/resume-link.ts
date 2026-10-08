import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
