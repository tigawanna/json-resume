import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";

export const resumeVolunteer = sqliteTable(
  "resume_volunteer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organization: text("organization").notNull(),
    role: text("role").default("").notNull(),
    startDate: text("start_date").default("").notNull(),
    endDate: text("end_date").default("").notNull(),
    description: text("description").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_volunteer_userId_idx").on(table.userId)],
);

export const resumeVolunteerItem = sqliteTable(
  "resume_volunteer_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    volunteerId: text("volunteer_id")
      .notNull()
      .references(() => resumeVolunteer.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_volunteer_item_resumeId_idx").on(table.resumeId),
    index("resume_volunteer_item_volunteerId_idx").on(table.volunteerId),
    uniqueIndex("resume_volunteer_item_unique_idx").on(table.resumeId, table.volunteerId),
  ],
);
