import { auth } from "@api/auth/auth";
import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client";
import { waitlistEntry } from "@repo/db/schema/credits-schema";

/** Normalized on the way in: trimmed, lowercased, then validated. */
export const joinWaitlistInput = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email().max(320)),
  name: z.string().trim().min(1).max(120).optional(),
  /** Explicit consent checkbox. */
  consent: z.literal(true),
  /** Where the join came from. `admin` is reserved for admins. */
  source: z.enum(["landing", "waitlist-page", "dashboard"]).default("landing"),
  /**
   * Honeypot. Real users never see this field; bots fill it. Any non-empty
   * value is silently dropped with the same success response.
   */
  website: z.string().optional(),
});

/**
 * Public demand capture. Visitors can join the waitlist; a signed-in visitor
 * whose session email matches gets their entry linked immediately.
 */
export const waitlistRoute = new Hono<AppEnv>()
  .post(
    "/",
    zValidator("json", joinWaitlistInput, (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody({
            message: "Invalid request body",
            code: "VALIDATION_ERROR",
            issues: result.error.issues,
          }),
          400,
        );
      }
    }),
    async (c) => {
      const { email, name, source, website } = c.req.valid("json");
      const log = c.get("log");

      if (website && website.trim().length > 0) {
        // Bot: same response, no write, no log noise beyond the request event.
        return c.json({ joined: true });
      }

      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      const sessionMatches =
        session?.user.email?.trim().toLowerCase() === email && !session.user.banned;

      const existing = await db
        .select()
        .from(waitlistEntry)
        .where(eq(waitlistEntry.email, email))
        .limit(1);

      let entryId: string;
      if (existing.length > 0) {
        entryId = existing[0]!.id;
        // Link by email only when the entry is unclaimed.
        if (sessionMatches && !existing[0]!.userId) {
          await db
            .update(waitlistEntry)
            .set({ userId: session.user.id, claimedAt: new Date() })
            .where(eq(waitlistEntry.id, entryId));
        }
        log.set({ waitlist: { entryId, source, duplicate: true } });
        // Same response for new and existing emails: no enumeration.
        return c.json({ joined: true });
      }

      const inserted = await db
        .insert(waitlistEntry)
        .values({
          email,
          name,
          source,
          consentAt: new Date(),
          userId: sessionMatches ? session.user.id : null,
          claimedAt: sessionMatches ? new Date() : null,
        })
        .onConflictDoNothing({ target: waitlistEntry.email })
        .returning({ id: waitlistEntry.id });

      if (inserted.length > 0) {
        entryId = inserted[0]!.id;
        log.set({ waitlist: { entryId, source, duplicate: false } });
      } else {
        // Lost a race against a concurrent join; fall back to the winner's row.
        const winner = await db
          .select({ id: waitlistEntry.id })
          .from(waitlistEntry)
          .where(eq(waitlistEntry.email, email))
          .limit(1);
        entryId = winner[0]!.id;
        log.set({ waitlist: { entryId, source, duplicate: true } });
      }

      return c.json({ joined: true });
    },
  )
  /**
   * Idempotent claim: links the signed-in user to an existing waitlist entry
   * with the same email. Called on dashboard load; never overwrites a claim.
   */
  .post("/claim", requireSession, async (c) => {
    const session = c.get("session");
    const email = session.user.email.trim().toLowerCase();

    const existing = await db
      .select({ id: waitlistEntry.id, userId: waitlistEntry.userId })
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, email))
      .limit(1);

    if (existing.length === 0 || existing[0]!.userId) {
      return c.json({ claimed: false });
    }

    await db
      .update(waitlistEntry)
      .set({ userId: session.user.id, claimedAt: new Date() })
      .where(eq(waitlistEntry.id, existing[0]!.id));

    return c.json({ claimed: true });
  });
