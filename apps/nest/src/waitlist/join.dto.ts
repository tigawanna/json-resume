import { waitlistEntryZod } from "@repo/db/zod";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const joinWaitlist = waitlistEntryZod.insert
  .pick({
    email: true,
    name: true,
    source: true,
  })
  .extend({
    email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
    consent: z.literal(true),
    source: z.enum(["landing", "waitlist-page", "dashboard"]).default("landing"),
    website: z.string().optional(),
  });

export class JoinWaitlistDto extends createZodDto(joinWaitlist) {}

const joined = z.object({ joined: z.literal(true) });
export class JoinedResponseDto extends createZodDto(joined) {}

const claim = z.object({ claimed: z.boolean() });
export class ClaimResponseDto extends createZodDto(claim) {}
