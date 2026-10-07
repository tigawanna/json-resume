import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { syncEvent, user } from "@/lib/drizzle/scheam";
import { and, asc, count, desc, eq, isNotNull, isNull, max, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { z } from "zod";
import {
  ADMIN_EVENT_SORT_COLUMNS,
  type AdminEventSort,
  type AdminEventSortColumn,
  type adminEventFilterSchema,
  type adminEventListSchema,
} from "./admin-event-filters";
import { escapeLike } from "./admin-tables.server";

type AdminEventFilter = z.infer<typeof adminEventFilterSchema> & { collectionId?: string };

function contains(column: SQLiteColumn, needle: string): SQL {
  return sql`${column} like ${`%${escapeLike(needle)}%`} escape '\\'`;
}

function eventWhere(filter: AdminEventFilter): SQL | undefined {
  const q = filter.q?.trim();
  return and(
    filter.userId ? eq(syncEvent.userId, filter.userId) : undefined,
    q
      ? or(contains(user.email, q), contains(syncEvent.collectionId, q), contains(syncEvent.key, q))
      : undefined,
    filter.type ? eq(syncEvent.type, filter.type) : undefined,
    filter.applied === "yes" ? isNotNull(syncEvent.projectedAt) : undefined,
    filter.applied === "no" ? isNull(syncEvent.projectedAt) : undefined,
    filter.collectionId ? eq(syncEvent.collectionId, filter.collectionId) : undefined,
  );
}

const sortColumns = {
  seq: syncEvent.globalSeq,
  when: syncEvent.serverTimestamp,
  user: user.email,
  collection: syncEvent.collectionId,
  type: syncEvent.type,
  applied: syncEvent.projectedAt,
} satisfies Record<AdminEventSortColumn, SQLiteColumn>;

function eventOrder(sort: AdminEventSort): SQL[] {
  const column = ADMIN_EVENT_SORT_COLUMNS.find((name) => sort.startsWith(`${name}-`)) ?? "seq";
  const by = sort.endsWith("-asc") ? asc : desc;
  return [by(sortColumns[column]), by(syncEvent.globalSeq)];
}

export async function readAdminEvents(input: z.infer<typeof adminEventListSchema>) {
  const where = eventWhere(input);
  const [[total], [unprojected], rows] = await Promise.all([
    db
      .select({ n: count() })
      .from(syncEvent)
      .leftJoin(user, eq(user.id, syncEvent.userId))
      .where(where),
    db
      .select({ n: count() })
      .from(syncEvent)
      .leftJoin(user, eq(user.id, syncEvent.userId))
      .where(and(where, isNull(syncEvent.projectedAt))),
    db
      .select({
        globalSeq: syncEvent.globalSeq,
        collectionId: syncEvent.collectionId,
        type: syncEvent.type,
        key: syncEvent.key,
        clientId: syncEvent.clientId,
        serverTimestamp: syncEvent.serverTimestamp,
        projectedAt: syncEvent.projectedAt,
        userId: syncEvent.userId,
        userEmail: user.email,
      })
      .from(syncEvent)
      .leftJoin(user, eq(user.id, syncEvent.userId))
      .where(where)
      .orderBy(...eventOrder(input.sort))
      .limit(input.pageSize)
      .offset(input.page * input.pageSize),
  ]);

  return {
    total: total?.n ?? 0,
    unprojected: unprojected?.n ?? 0,
    page: input.page,
    pageSize: input.pageSize,
    events: rows.map((row) => ({
      ...row,
      serverTimestamp: row.serverTimestamp.getTime(),
      projectedAt: row.projectedAt?.getTime() ?? null,
    })),
  };
}

export async function readAdminEventsByCollection(filter: z.infer<typeof adminEventFilterSchema>) {
  const rows = await db
    .select({
      collectionId: syncEvent.collectionId,
      total: count(),
      unprojected: sql<number>`sum(case when ${syncEvent.projectedAt} is null then 1 else 0 end)`,
    })
    .from(syncEvent)
    .leftJoin(user, eq(user.id, syncEvent.userId))
    .where(eventWhere(filter))
    .groupBy(syncEvent.collectionId)
    .orderBy(desc(count()));
  return rows.map((row) => ({ ...row, unprojected: Number(row.unprojected) }));
}

export async function readAdminEventUsers() {
  const rows = await db
    .select({
      userId: syncEvent.userId,
      name: user.name,
      email: user.email,
      events: count(),
      unprojected: sql<number>`sum(case when ${syncEvent.projectedAt} is null then 1 else 0 end)`,
      lastEventAt: max(syncEvent.serverTimestamp),
    })
    .from(syncEvent)
    .leftJoin(user, eq(user.id, syncEvent.userId))
    .groupBy(syncEvent.userId)
    .orderBy(desc(count()));
  return rows.map((row) => ({
    ...row,
    unprojected: Number(row.unprojected),
    lastEventAt: row.lastEventAt?.getTime() ?? null,
  }));
}
