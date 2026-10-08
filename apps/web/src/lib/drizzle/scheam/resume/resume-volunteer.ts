import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
