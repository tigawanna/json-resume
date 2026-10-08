import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { embeddable, timestamps } from "./shared-columns";
import { uuidv7 } from "uuidv7";

export const resumeCertification = sqliteTable(
  "resume_certification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    issuer: text("issuer").default("").notNull(),
    date: text("date").default("").notNull(),
    url: text("url").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_certification_userId_idx").on(table.userId)],
);
