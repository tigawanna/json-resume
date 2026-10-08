import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { embeddable, timestamps } from "./shared-columns";
import { uuidv7 } from "uuidv7";

export const resumeContact = sqliteTable(
  "resume_contact",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    /** e.g. "email", "phone", "location", "address" */
    type: text("type").notNull(),
    value: text("value").notNull(),
    label: text("label").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_contact_userId_idx").on(table.userId)],
);
