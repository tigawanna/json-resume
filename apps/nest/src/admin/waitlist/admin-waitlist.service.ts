import { DRIZZLE, type DrizzleDB } from '@/database/database.module.js';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { waitlistEntry } from '@repo/db/schema/credits-schema';
import { desc, eq } from 'drizzle-orm';
import type { AddWaitlistEntryDto } from './admin-waitlist.dto.js';

@Injectable()
export class AdminWaitlistService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  findAll() {
    return this.db
      .select()
      .from(waitlistEntry)
      .orderBy(desc(waitlistEntry.createdAt));
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
