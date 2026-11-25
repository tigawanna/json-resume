import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { waitlistEntry } from '@repo/db/schema/credits-schema';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { encodeCursor, type CursorQuery } from '../../shared/pagination/cursor.js';
import type { CursorPaginatedDto } from '../../shared/types/response-shapes.js';
import type { AddWaitlistEntryDto } from './admin-waitlist.dto.js';

type WaitlistEntry = typeof waitlistEntry.$inferSelect;

@Injectable()
export class AdminWaitlistService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll({ query }: { query: CursorQuery }): Promise<CursorPaginatedDto<WaitlistEntry>> {
    const { cursor, direction, limit } = query;
    const forward = direction === 'next';
    const dirct = forward ? lt : gt;
    const order = forward ? desc : asc;
    const rows = await this.db
      .select()
      .from(waitlistEntry)
      .where(
        cursor
          ? or(
              dirct(waitlistEntry.createdAt, cursor.createdAt),
              and(eq(waitlistEntry.createdAt, cursor.createdAt), dirct(waitlistEntry.id, cursor.id)),
            )
          : undefined,
      )
      .orderBy(order(waitlistEntry.createdAt), order(waitlistEntry.id))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const items = forward ? page : page.reverse();
    const hasNextPage = forward ? hasMore : Boolean(cursor);
    const hasPreviousPage = forward ? Boolean(cursor) : hasMore;
    const first = items.at(0);
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasNextPage && last ? encodeCursor(last) : null,
      previousCursor: hasPreviousPage && first ? encodeCursor(first) : null,
      hasNextPage,
      hasPreviousPage,
    };
  }

  async findOne({ id }: { id: string }) {
    const [row] = await this.db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Waitlist entry not found');
    return row;
  }

  async add({ body }: { body: AddWaitlistEntryDto }) {
    const [row] = await this.db
      .insert(waitlistEntry)
      .values({
        email: body.email.trim().toLowerCase(),
        source: 'admin',
        consentAt: new Date(),
      })
      .onConflictDoNothing({ target: waitlistEntry.email })
      .returning();
    if (!row) throw new ConflictException('Email is already on the waitlist');
    return row;
  }

  async remove({ id }: { id: string }) {
    const [row] = await this.db
      .update(waitlistEntry)
      .set({ status: 'removed' })
      .where(eq(waitlistEntry.id, id))
      .returning();
    if (!row) throw new NotFoundException('Waitlist entry not found');
    return row;
  }
}
