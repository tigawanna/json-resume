import { z } from "zod";

export const userIdParam = z.object({
  userId: z.string().min(1).max(64),
});

export const grantInput = z.object({
  amount: z.number().int().min(1).max(10_000),
  reason: z.string().trim().min(1).max(500),
});

export const adjustInput = z.object({
  bucket: z.enum(["monthly", "bonus"]),
  /** Signed: negative removes credits. */
  amount: z
    .number()
    .int()
    .refine((value) => value !== 0, "Amount cannot be zero"),
  reason: z.string().trim().min(1).max(500),
});

export const ledgerQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
