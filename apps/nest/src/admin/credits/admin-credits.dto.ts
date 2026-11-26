import { creditLedgerZod } from '@repo/db/zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { cursorQuery } from '../../shared/pagination/cursor.js';

const userIdParam = z.object({ userId: z.string().min(1) });
export class CreditsUserIdParamDto extends createZodDto(userIdParam) {}

export class CreditLedgerListQueryDto extends createZodDto(cursorQuery) {}

const adjustCredits = z.object({
  amount: z
    .number()
    .int()
    .refine((value) => value !== 0, 'Amount must not be zero'),
  reason: z.string().trim().min(1).max(500),
  idempotencyKey: z.string().trim().min(1).max(200),
});
export class AdjustCreditsDto extends createZodDto(adjustCredits) {}

const creditLedgerResponse = creditLedgerZod.select.extend({
  createdAt: z.iso.datetime(),
});
export class CreditLedgerEntryDto extends createZodDto(creditLedgerResponse) {}

const adminCreditsResponse = z.object({
  monthly: z.number(),
  bonus: z.number(),
  available: z.number(),
  monthlyPeriodKey: z.string().nullable(),
  waitlistJoined: z.boolean(),
});
export class AdminCreditsDto extends createZodDto(adminCreditsResponse) {}
