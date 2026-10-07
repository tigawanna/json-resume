import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import {
  job,
  publicResume,
  resume,
  session,
  syncBackend,
  syncEvent,
  user,
} from "@/lib/drizzle/scheam";
import { count, gt, isNull, sql } from "drizzle-orm";

const DAY_MS = 86_400_000;

export async function readAdminStats() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - DAY_MS);

  const [
    [users],
    [admins],
    [resumes],
    [publicResumes],
    [jobs],
    [events],
    [unprojected],
    [eventsToday],
    [activeSessions],
    [backend],
  ] = await Promise.all([
    db.select({ n: count() }).from(user),
    db
      .select({ n: count() })
      .from(user)
      .where(sql`',' || replace(${user.role}, ' ', '') || ',' like '%,admin,%'`),
    db.select({ n: count() }).from(resume),
    db.select({ n: count() }).from(publicResume),
    db.select({ n: count() }).from(job),
    db.select({ n: count() }).from(syncEvent),
    db.select({ n: count() }).from(syncEvent).where(isNull(syncEvent.projectedAt)),
    db.select({ n: count() }).from(syncEvent).where(gt(syncEvent.serverTimestamp, dayAgo)),
    db.select({ n: count() }).from(session).where(gt(session.expiresAt, now)),
    db.select({ lastProjectedSeq: syncBackend.lastProjectedSeq }).from(syncBackend).limit(1),
  ]);

  return {
    users: users?.n ?? 0,
    admins: admins?.n ?? 0,
    resumes: resumes?.n ?? 0,
    publicResumes: publicResumes?.n ?? 0,
    jobs: jobs?.n ?? 0,
    events: events?.n ?? 0,
    unprojectedEvents: unprojected?.n ?? 0,
    eventsLast24h: eventsToday?.n ?? 0,
    activeSessions: activeSessions?.n ?? 0,
    lastProjectedSeq: backend?.lastProjectedSeq ?? null,
  };
}
