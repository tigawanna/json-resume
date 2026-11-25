import { waitlistEntryZod } from '@repo/db/zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { cursorQuery } from '../../shared/pagination/cursor.js';

const addWaitlistEntry = waitlistEntryZod.insert
  .pick({ name: true, notes: true })
  .extend({
    email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  });
export class AddWaitlistEntryDto extends createZodDto(addWaitlistEntry) {}

const waitlistIdParam = z.object({ id: z.uuid() });
export class WaitlistIdParamDto extends createZodDto(waitlistIdParam) {}

export class WaitlistListQueryDto extends createZodDto(cursorQuery) {}

const waitlistEntryResponse = waitlistEntryZod.select.extend({
  consentAt: z.iso.datetime(),
  claimedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export class WaitlistEntryDto extends createZodDto(waitlistEntryResponse) {}
