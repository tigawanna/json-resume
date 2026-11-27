import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { embeddable, timestamps } from "./shared-columns.ts";

export const resumeVolunteer = pgTable(
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
