import { index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../auth-schema.ts";
import { timestamps } from "./shared-columns.ts";

/**
 * Published resume snapshot for public share links (`/r/:id`).
 * Written directly from the client (not via local-first sync).
 * `sourceResumeId` is the local resume id — not an FK to `resume`
 * because offline-first rows may never exist on the server.
 */
export const publicResume = pgTable(
  "public_resume",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Local / OPFS resume id this snapshot was published from */
    sourceResumeId: text("source_resume_id").notNull(),
    /** Display title for the public page / PDF filename */
    title: text("title").notNull(),
    /** Full renderable snapshot */
    document: jsonb("document").$type<Record<string, unknown>>().notNull(),
    ...timestamps,
  },
  (table) => [
    index("public_resume_userId_idx").on(table.userId),
    uniqueIndex("public_resume_userId_sourceResumeId_idx").on(table.userId, table.sourceResumeId),
  ],
);
