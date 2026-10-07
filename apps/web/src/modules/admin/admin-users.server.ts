import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, syncEvent, user } from "@/lib/drizzle/scheam";
import { count } from "drizzle-orm";

export async function listAdminUsers() {
  const [users, eventCounts, resumeCounts] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.name),
    db.select({ userId: syncEvent.userId, n: count() }).from(syncEvent).groupBy(syncEvent.userId),
    db.select({ userId: resume.userId, n: count() }).from(resume).groupBy(resume.userId),
  ]);

  const events = new Map(eventCounts.map((row) => [row.userId, row.n]));
  const resumes = new Map(resumeCounts.map((row) => [row.userId, row.n]));
  return users.map((row) => ({
    ...row,
    createdAt: row.createdAt.getTime(),
    events: events.get(row.id) ?? 0,
    resumes: resumes.get(row.id) ?? 0,
  }));
}
