import { waitlistEntryZod } from '@repo/db/zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const addWaitlistEntry = waitlistEntryZod.insert
  .pick({ name: true, notes: true })
  .extend({
    email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  });
export class AddWaitlistEntryDto extends createZodDto(addWaitlistEntry) {}

const waitlistIdParam = z.object({ id: z.uuid() });
export class WaitlistIdParamDto extends createZodDto(waitlistIdParam) {}

const waitlistEntryIdParam = z.object({ id: z.string().min(1).max(64) });
export class WaitlistEntryIdParamDto extends createZodDto(waitlistEntryIdParam) {}

export class WaitlistListQueryDto extends createZodDto(
  z.object({
    q: z.string().trim().max(200).optional(),
    status: z.enum(['joined', 'removed']).optional(),
    hasAccount: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
  }),
) {}

const waitlistEntryResponse = waitlistEntryZod.select.extend({
  consentAt: z.iso.datetime(),
  claimedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export class WaitlistEntryDto extends createZodDto(waitlistEntryResponse) {}

const waitlistListItem = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  status: z.string(),
  source: z.string(),
  notes: z.string().nullable(),
  userId: z.string().nullable(),
  userEmail: z.string().nullable(),
  claimedAt: z.iso.datetime().nullable(),
  consentAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});
export class AdminWaitlistListItemDto extends createZodDto(waitlistListItem) {}
export type AdminWaitlistListItem = z.infer<typeof waitlistListItem>;

const waitlistPagination = z.object({
  page: z.number().int().min(1),
  perPage: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().min(1),
});

export class AdminWaitlistPageDto extends createZodDto(
  z.object({
    items: z.array(waitlistListItem),
    pagination: waitlistPagination,
  }),
) {}

export class WaitlistStatsDto extends createZodDto(
  z.object({
    joined: z.number().int().nonnegative(),
    linked: z.number().int().nonnegative(),
    removed: z.number().int().nonnegative(),
  }),
) {}

export class UpdateWaitlistEntryDto extends createZodDto(
  z.object({
    status: z.enum(['joined', 'removed']).optional(),
    userId: z.string().min(1).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  }),
) {}

export class WaitlistUpdateResponseDto extends createZodDto(
  z.object({ entry: waitlistEntryResponse }),
) {}
