import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { embeddable, timestamps } from "./resume/shared-columns";

export const job = sqliteTable(
  "job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    /** Optional — "" when unknown. Only `description` is required. */
    company: text("company").notNull(),
    title: text("title").default("").notNull(),
    description: text("description").notNull(),
    url: text("url").default("").notNull(),
    location: text("location").default("").notNull(),
    /** Stated rate from the posting, e.g. "50-100 USD / Month". "" when the page has none. */
    payRate: text("pay_rate").default("").notNull(),
    /** USD cents per hour. Null when the page states no convertible rate. */
    hourlyMinCents: integer("hourly_min_cents"),
    hourlyMaxCents: integer("hourly_max_cents"),
    /** How the hourly figures were derived. Null when the page states no rate. */
    payBasis: text("pay_basis"),
    status: text("status").default("saved").notNull(),
    notes: text("notes").default("").notNull(),
    appliedAt: integer("applied_at", { mode: "timestamp_ms" }),
    ...embeddable,
    ...timestamps,
  },
  (table) => [
    index("job_userId_idx").on(table.userId),
    index("job_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    index("job_status_idx").on(table.status),
  ],
);

export const jobRelations = relations(job, ({ one }) => ({
  user: one(user, {
    fields: [job.userId],
    references: [user.id],
  }),
}));
