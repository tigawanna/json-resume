import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
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

export const resumeContactItem = sqliteTable(
  "resume_contact_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => resumeContact.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_contact_item_resumeId_idx").on(table.resumeId),
    index("resume_contact_item_contactId_idx").on(table.contactId),
    uniqueIndex("resume_contact_item_unique_idx").on(table.resumeId, table.contactId),
  ],
);
