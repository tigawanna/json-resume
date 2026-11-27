import { creditLedgerZod } from '@repo/db/zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const creditPolicy = z.object({
  monthlyCredits: z.number().int(),
  resumeCost: z.number().int(),
  requireWaitlist: z.boolean(),
});
export class CreditPolicyDto extends createZodDto(creditPolicy) {}

const walletResponse = z.object({
  monthly: z.number().int(),
  bonus: z.number().int(),
  available: z.number().int(),
  monthlyPeriodKey: z.string().nullable(),
  resetsAt: z.iso.datetime(),
  waitlistJoined: z.boolean(),
  policy: creditPolicy,
});
export class CreditsResponseDto extends createZodDto(walletResponse) {}
export type WalletResponse = z.infer<typeof walletResponse>;

export class WalletCheckDto extends createZodDto(
  z.object({ action: z.enum(['create', 'clone', 'import', 'tailor']) }),
) {}

export class WalletCheckResponseDto extends createZodDto(
  z.object({
    available: z.number().int(),
    monthly: z.number().int(),
    bonus: z.number().int(),
    resetsAt: z.iso.datetime(),
  }),
) {}

export class CreditLedgerQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
  }),
) {}

const creditLedgerEntry = creditLedgerZod.select.extend({
  createdAt: z.iso.datetime(),
});
export class CreditLedgerEntryDto extends createZodDto(creditLedgerEntry) {}

const creditLedgerPagination = z.object({
  page: z.number().int().min(1),
  perPage: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().min(1),
});

export class CreditLedgerPageDto extends createZodDto(
  z.object({
    items: z.array(creditLedgerEntry),
    pagination: creditLedgerPagination,
    periodKey: z.string(),
  }),
) {}
