import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";

export const resumeCertification = sqliteTable(
  "resume_certification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    issuer: text("issuer").default("").notNull(),
    date: text("date").default("").notNull(),
    url: text("url").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [
    index("resume_certification_userId_idx").on(table.userId),
    index("resume_certification_resumeId_idx").on(table.resumeId),
  ],
);

export const resumeCertificationItem = sqliteTable(
  "resume_certification_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    certificationId: text("certification_id")
      .notNull()
      .references(() => resumeCertification.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_certification_item_resumeId_idx").on(table.resumeId),
    index("resume_certification_item_certificationId_idx").on(table.certificationId),
    uniqueIndex("resume_certification_item_unique_idx").on(table.resumeId, table.certificationId),
  ],
);
