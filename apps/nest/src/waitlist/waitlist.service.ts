import { Inject, Injectable } from '@nestjs/common';
import { waitlistEntry } from '@repo/db/schema/credits-schema';
import { eq } from 'drizzle-orm';
import type { UserWithRole } from '../auth/helpers/utils.js';
import { CreditsService } from '../credits/credits.service.js';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import type { JoinWaitlistDto } from './join.dto.js';

@Injectable()
export class WaitlistService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly credits: CreditsService,
  ) {}

  /** Always answer joined. Skip insert on honeypot; claim the row when the session email matches. */
  async join({ body, current }: { body: JoinWaitlistDto; current?: UserWithRole }) {
    if (body.website && body.website.trim().length > 0)
      return { joined: true as const };
    // if bad user we exit but if no session user we unly save their emial in the waitlist
    const eligibleUser = this.eligibleClaimUser({ body, current });
    // See if this email already joined.
    const [existing] = await this.db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, body.email))
      .limit(1);

    if (existing) {
      if (eligibleUser && !existing.userId)
        await this.claimRow({ id: existing.id, userId: eligibleUser.id });
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
        userId: eligibleUser?.id ?? null,
        claimedAt: eligibleUser ? new Date() : null,
      })
      .onConflictDoNothing({ target: waitlistEntry.email });

    if (eligibleUser) await this.credits.allocation({ userId: eligibleUser.id });
    return { joined: true as const };
  }

  /** Attach an unclaimed waitlist row for this session email, then allocate credits. */
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

  /** Session user only when their email matches the join email and they are not banned. */
  private eligibleClaimUser({
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

  /** Write userId and claimedAt on the row, then run monthly credit allocation. */
  private async claimRow({ id, userId }: { id: string; userId: string }) {
    await this.db
      .update(waitlistEntry)
      .set({ userId, claimedAt: new Date() })
      .where(eq(waitlistEntry.id, id));
    await this.credits.allocation({ userId });
  }
}
