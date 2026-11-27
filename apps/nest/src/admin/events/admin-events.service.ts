import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_EVENT_SORT_COLUMNS } from '@repo/api-contracts/admin/events';
import { user } from '@repo/db/postgres/schema/auth-schema';
import { syncEvent } from '@repo/db/postgres/schema/sync-schema';
import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  max,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import { escapeLike } from '../tables/admin-table-metadata-helpers.js';
import type {
  AdminEventFilterDto,
  AdminEventListQueryDto,
} from './admin-events.dto.js';

function contains(column: AnyColumn, needle: string): SQL {
  return sql`cast(${column} as text) ilike ${`%${escapeLike({ value: needle })}%`} escape '\\'`;
}

function eventWhere(filter: AdminEventFilterDto): SQL | undefined {
  const q = filter.q?.trim();
  return and(
    filter.userId ? eq(syncEvent.userId, filter.userId) : undefined,
    q
      ? or(
          contains(user.email, q),
          contains(syncEvent.collectionId, q),
          contains(syncEvent.key, q),
        )
      : undefined,
    filter.type ? eq(syncEvent.type, filter.type) : undefined,
    filter.applied === 'yes' ? isNotNull(syncEvent.projectedAt) : undefined,
    filter.applied === 'no' ? isNull(syncEvent.projectedAt) : undefined,
  );
}

function eventOrder(sort: AdminEventListQueryDto['sort']): SQL[] {
  const name =
    ADMIN_EVENT_SORT_COLUMNS.find((column) => sort.startsWith(`${column}-`)) ??
    'seq';
  const columns = {
    seq: syncEvent.globalSeq,
    when: syncEvent.serverTimestamp,
    user: user.email,
    collection: syncEvent.collectionId,
    type: syncEvent.type,
    applied: syncEvent.projectedAt,
  };
  const column = columns[name];
  const by = sort.endsWith('-asc') ? asc : desc;
  return [by(column), by(syncEvent.globalSeq)];
}

@Injectable()
export class AdminEventsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(query: AdminEventListQueryDto) {
    const where = eventWhere(query);
    const [[total], [unprojected], rows] = await Promise.all([
      this.db
        .select({ n: count() })
        .from(syncEvent)
        .leftJoin(user, eq(user.id, syncEvent.userId))
        .where(where),
      this.db
        .select({ n: count() })
        .from(syncEvent)
        .leftJoin(user, eq(user.id, syncEvent.userId))
        .where(and(where, isNull(syncEvent.projectedAt))),
      this.db
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
        .orderBy(...eventOrder(query.sort))
        .limit(query.pageSize)
        .offset(query.page * query.pageSize),
    ]);

    return {
      total: total?.n ?? 0,
      unprojected: unprojected?.n ?? 0,
      page: query.page,
      pageSize: query.pageSize,
      events: rows.map((row) => ({
        ...row,
        serverTimestamp: row.serverTimestamp.getTime(),
        projectedAt: row.projectedAt?.getTime() ?? null,
      })),
    };
  }

  async byCollection(filter: AdminEventFilterDto) {
    const rows = await this.db
      .select({
        collectionId: syncEvent.collectionId,
        total: count(),
        unprojected: sql<number>`count(*) filter (where ${syncEvent.projectedAt} is null)::int`,
      })
      .from(syncEvent)
      .leftJoin(user, eq(user.id, syncEvent.userId))
      .where(eventWhere(filter))
      .groupBy(syncEvent.collectionId)
      .orderBy(desc(count()));
    return rows;
  }

  async users() {
    const rows = await this.db
      .select({
        userId: syncEvent.userId,
        name: user.name,
        email: user.email,
        events: count(),
        unprojected: sql<number>`count(*) filter (where ${syncEvent.projectedAt} is null)::int`,
        lastEventAt: max(syncEvent.serverTimestamp),
      })
      .from(syncEvent)
      .leftJoin(user, eq(user.id, syncEvent.userId))
      .groupBy(syncEvent.userId, user.name, user.email)
      .orderBy(desc(count()));
    return rows.map((row) => ({
      ...row,
      lastEventAt: row.lastEventAt?.getTime() ?? null,
    }));
  }
}
