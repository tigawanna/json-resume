import { Inject, Injectable } from '@nestjs/common';
import { waitlistEntry } from '@repo/db/schema/credits-schema';
import { eq } from 'drizzle-orm';
import type { UserWithRole } from '../auth/helpers/utils.js';
import { CreditsService } from '../credits/credits.service.js';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import type { JoinWaitlistDto } from './join.schema.js';

@Injectable()
export class WaitlistService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly credits: CreditsService,
  ) {}

  async join({ body, current }: { body: JoinWaitlistDto; current?: UserWithRole }) {
    if (body.website && body.website.trim().length > 0)
      return { joined: true as const };
    const linked = this.linkTarget({ body, current });
    // See if this email already joined.
    const [existing] = await this.db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, body.email))
      .limit(1);

    if (existing) {
      if (linked && !existing.userId)
        await this.claimRow({ id: existing.id, userId: linked.id });
      return { joined: true as const };
    }

    // Record a new waitlist row for this email.
    await this.db
      .insert(waitlistEntry)
      .values({
        email: body.email,
        name: body.name,
        source: body.source,
        consentAt: new Date(),
        userId: linked?.id ?? null,
        claimedAt: linked ? new Date() : null,
      })
      .onConflictDoNothing({ target: waitlistEntry.email });

    if (linked) await this.credits.allocation({ userId: linked.id });
    return { joined: true as const };
  }

  async claim({ current }: { current: UserWithRole }) {
    const email = current.email.trim().toLowerCase();
    // Find an unclaimed waitlist row for this signed-in email.
    const [existing] = await this.db
      .select({ id: waitlistEntry.id, userId: waitlistEntry.userId })
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, email))
      .limit(1);
    if (!existing || existing.userId) return { claimed: false };
    await this.claimRow({ id: existing.id, userId: current.id });
    return { claimed: true };
  }

  private linkTarget({
    body,
    current,
  }: {
    body: JoinWaitlistDto;
    current?: UserWithRole;
  }) {
    if (!current || current.banned) return undefined;
    if (current.email.trim().toLowerCase() !== body.email) return undefined;
    return current;
  }

  private async claimRow({ id, userId }: { id: string; userId: string }) {
    // Attach the waitlist row to this user.
    await this.db
      .update(waitlistEntry)
      .set({ userId, claimedAt: new Date() })
      .where(eq(waitlistEntry.id, id));
    await this.credits.allocation({ userId });
  }
}
