import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const joinWaitlistSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  name: z.string().trim().min(1).max(120).optional(),
  consent: z.literal(true),
  source: z.enum(["landing", "waitlist-page", "dashboard"]).default("landing"),
  website: z.string().optional(),
});

export class JoinWaitlistDto extends createZodDto(joinWaitlistSchema) {}

export const joinedSchema = z.object({ joined: z.literal(true) });
export class JoinedResponseDto extends createZodDto(joinedSchema) {}

export const claimSchema = z.object({ claimed: z.boolean() });
export class ClaimResponseDto extends createZodDto(claimSchema) {}
