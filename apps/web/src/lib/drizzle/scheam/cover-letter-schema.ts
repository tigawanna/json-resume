import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { embeddable, timestamps } from "./resume/shared-columns";

export const coverLetter = sqliteTable(
  "cover_letter",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    title: text("title").default("").notNull(),
    /** Markdown. The preview, the PDF and the rich-text copy all render this text. */
    body: text("body").default("").notNull(),
    /** Résumé the letter goes with. No foreign key: deleting the résumé keeps the letter. */
    resumeId: text("resume_id"),
    /** Tracked job the letter targets. */
    jobId: text("job_id"),
    ...embeddable,
    ...timestamps,
  },
  (table) => [
    index("cover_letter_userId_idx").on(table.userId),
    index("cover_letter_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    index("cover_letter_resumeId_idx").on(table.resumeId),
  ],
);

export const coverLetterRelations = relations(coverLetter, ({ one }) => ({
  user: one(user, {
    fields: [coverLetter.userId],
    references: [user.id],
  }),
}));
