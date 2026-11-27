import { Inject, Injectable } from '@nestjs/common';
import { user } from '@repo/db/schema/auth-schema';
import { waitlistEntry } from '@repo/db/schema/credits-schema';
import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  like,
  or,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type {
  AdminWaitlistListItem,
  WaitlistListQueryDto,
} from './admin-waitlist.dto.js';

type WaitlistRow = typeof waitlistEntry.$inferSelect;

@Injectable()
export class AdminWaitlistQueryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll({ query }: { query: WaitlistListQueryDto }) {
    const where = this.filterOf({ query });
    const [[totals], items] = await Promise.all([
      this.db.select({ n: count() }).from(waitlistEntry).where(where),
      this.db
        .select({
          id: waitlistEntry.id,
          email: waitlistEntry.email,
          name: waitlistEntry.name,
          status: waitlistEntry.status,
          source: waitlistEntry.source,
          notes: waitlistEntry.notes,
          userId: waitlistEntry.userId,
          userEmail: user.email,
          claimedAt: waitlistEntry.claimedAt,
          consentAt: waitlistEntry.consentAt,
          createdAt: waitlistEntry.createdAt,
        })
        .from(waitlistEntry)
        .leftJoin(user, eq(waitlistEntry.userId, user.id))
        .where(where)
        .orderBy(desc(waitlistEntry.createdAt), asc(waitlistEntry.id))
        .limit(query.perPage)
        .offset((query.page - 1) * query.perPage),
    ]);
    const total = totals?.n ?? 0;
    return {
      items: items.map((item) => ({
        ...item,
        claimedAt: item.claimedAt?.toISOString() ?? null,
        consentAt: item.consentAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })) satisfies AdminWaitlistListItem[],
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.perPage)),
      },
    };
  }

  async stats() {
    const [[joined], [linked], [removed]] = await Promise.all([
      this.db
        .select({ n: count() })
        .from(waitlistEntry)
        .where(eq(waitlistEntry.status, 'joined')),
      this.db
        .select({ n: count() })
        .from(waitlistEntry)
        .where(and(eq(waitlistEntry.status, 'joined'), isNotNull(waitlistEntry.userId))),
      this.db
        .select({ n: count() })
        .from(waitlistEntry)
        .where(eq(waitlistEntry.status, 'removed')),
    ]);
    return {
      joined: joined?.n ?? 0,
      linked: linked?.n ?? 0,
      removed: removed?.n ?? 0,
    };
  }

  async exportCsv() {
    const rows = await this.db
      .select({
        email: waitlistEntry.email,
        name: waitlistEntry.name,
        status: waitlistEntry.status,
        source: waitlistEntry.source,
        userId: waitlistEntry.userId,
        userEmail: user.email,
        consentAt: waitlistEntry.consentAt,
        createdAt: waitlistEntry.createdAt,
      })
      .from(waitlistEntry)
      .leftJoin(user, eq(waitlistEntry.userId, user.id))
      .orderBy(asc(waitlistEntry.createdAt));
    return buildWaitlistCsv({ rows });
  }

  private filterOf({ query }: { query: WaitlistListQueryDto }): SQL | undefined {
    const filters: Array<SQL | undefined> = [];
    if (query.q)
      filters.push(
        or(
          like(waitlistEntry.email, `%${query.q}%`),
          like(waitlistEntry.name, `%${query.q}%`),
        ),
      );
    if (query.status) filters.push(eq(waitlistEntry.status, query.status));
    if (query.hasAccount === 'true') filters.push(isNotNull(waitlistEntry.userId));
    if (query.hasAccount === 'false') filters.push(isNull(waitlistEntry.userId));
    const defined = filters.filter((filter): filter is SQL => Boolean(filter));
    return defined.length > 0 ? and(...defined) : undefined;
  }
}

type WaitlistExportRow = Pick<
  WaitlistRow,
  'email' | 'name' | 'status' | 'source' | 'userId' | 'consentAt' | 'createdAt'
> & { userEmail: string | null };

function buildWaitlistCsv({ rows }: { rows: WaitlistExportRow[] }) {
  const header = 'email,name,status,source,userId,userEmail,consentAt,createdAt';
  const body = rows.map((row) =>
    [
      row.email,
      row.name ?? '',
      row.status,
      row.source,
      row.userId ?? '',
      row.userEmail ?? '',
      row.consentAt.toISOString(),
      row.createdAt.toISOString(),
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  );
  return [header, ...body].join('\n');
}
