import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { user } from '@repo/db/postgres/schema/auth-schema';
import { waitlistEntry } from '@repo/db/postgres/schema/credits-schema';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import {
  AdminAuditService,
  type AdminActor,
} from '../audit/admin-audit.service.js';
import type {
  AddWaitlistEntryDto,
  UpdateWaitlistEntryDto,
} from './admin-waitlist.dto.js';

@Injectable()
export class AdminWaitlistService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly audit: AdminAuditService,
  ) {}

  async findOne({ id }: { id: string }) {
    const [row] = await this.db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Waitlist entry not found');
    return row;
  }

  add({ actor, body }: { actor: AdminActor; body: AddWaitlistEntryDto }) {
    return this.audit.run({
      action: 'waitlist.admin-add',
      actor,
      input: { email: body.email },
      execute: () => this.addEntry({ body }),
    });
  }

  remove({ actor, id }: { actor: AdminActor; id: string }) {
    return this.audit.run({
      action: 'waitlist.admin-remove',
      actor,
      input: { id },
      execute: () => this.removeEntry({ id }),
    });
  }

  update({
    actor,
    id,
    body,
  }: {
    actor: AdminActor;
    id: string;
    body: UpdateWaitlistEntryDto;
  }) {
    return this.audit.run({
      action: 'waitlist.admin-update',
      actor,
      input: { id, status: body.status, userId: body.userId },
      execute: () => this.updateEntry({ id, body }),
    });
  }

  private async addEntry({ body }: { body: AddWaitlistEntryDto }) {
    const [row] = await this.db
      .insert(waitlistEntry)
      .values({
        email: body.email.trim().toLowerCase(),
        name: body.name,
        notes: body.notes,
        source: 'admin',
        consentAt: new Date(),
      })
      .onConflictDoNothing({ target: waitlistEntry.email })
      .returning();
    if (!row) throw new ConflictException('Email is already on the waitlist');
    return row;
  }

  private async removeEntry({ id }: { id: string }) {
    const [row] = await this.db
      .update(waitlistEntry)
      .set({ status: 'removed' })
      .where(eq(waitlistEntry.id, id))
      .returning();
    if (!row) throw new NotFoundException('Waitlist entry not found');
    return row;
  }

  private async updateEntry({
    id,
    body,
  }: {
    id: string;
    body: UpdateWaitlistEntryDto;
  }) {
    const changes: Partial<typeof waitlistEntry.$inferInsert> = {};
    if ('status' in body) changes.status = body.status;
    if ('notes' in body) changes.notes = body.notes;
    if ('userId' in body && typeof body.userId === 'string') {
      const [account] = await this.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, body.userId))
        .limit(1);
      if (!account) throw new NotFoundException('User not found');
      changes.userId = body.userId;
    } else if ('userId' in body) {
      changes.userId = null;
    }
    const [row] = await this.db
      .update(waitlistEntry)
      .set(changes)
      .where(eq(waitlistEntry.id, id))
      .returning();
    if (!row) throw new NotFoundException('Waitlist entry not found');
    return { entry: row };
  }
}
