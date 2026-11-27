import { creditLedgerZod, creditWalletZod, userZod } from '@repo/db/zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const userIdParam = z.object({ userId: z.string().min(1).max(64) });
export class CreditsUserIdParamDto extends createZodDto(userIdParam) {}

const ledgerQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
export class CreditLedgerListQueryDto extends createZodDto(ledgerQuery) {}

const adjustCredits = z.object({
  amount: z
    .number()
    .int()
    .refine((value) => value !== 0, 'Amount must not be zero'),
  reason: z.string().trim().min(1).max(500),
  idempotencyKey: z.string().trim().min(1).max(200),
});
export class AdjustCreditsDto extends createZodDto(adjustCredits) {}

export class AdminGrantDto extends createZodDto(
  z.object({
    amount: z.number().int().min(1).max(10_000),
    reason: z.string().trim().min(1).max(500),
  }),
) {}

export class AdminAdjustDto extends createZodDto(
  z.object({
    bucket: z.enum(['monthly', 'bonus']),
    amount: z.number().int().refine((value) => value !== 0, 'Amount must not be zero'),
    reason: z.string().trim().min(1).max(500),
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

export class AdminCreditLedgerPageDto extends createZodDto(
  z.object({
    items: z.array(creditLedgerEntry),
    pagination: creditLedgerPagination,
  }),
) {}

const creditWallet = creditWalletZod.select.extend({
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export class CreditWalletDto extends createZodDto(creditWallet) {}

const adminWalletUser = userZod.select
  .pick({
    id: true,
    name: true,
    email: true,
    role: true,
    banned: true,
  })
  .extend({ createdAt: z.iso.datetime() });

export class AdminWalletResponseDto extends createZodDto(
  z.object({ user: adminWalletUser, wallet: creditWallet }),
) {}

export class AdminCreditMutationResponseDto extends createZodDto(
  z.object({ wallet: creditWallet }),
) {}
