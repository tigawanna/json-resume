import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const adminStats = z.object({
  users: z.number().int().nonnegative(),
  admins: z.number().int().nonnegative(),
  resumes: z.number().int().nonnegative(),
  publicResumes: z.number().int().nonnegative(),
  jobs: z.number().int().nonnegative(),
  events: z.number().int().nonnegative(),
  unprojectedEvents: z.number().int().nonnegative(),
  eventsLast24h: z.number().int().nonnegative(),
  activeSessions: z.number().int().nonnegative(),
  lastProjectedSeq: z.number().int().nonnegative().nullable(),
});

export class AdminStatsDto extends createZodDto(adminStats) {}
export type AdminStats = z.infer<typeof adminStats>;
