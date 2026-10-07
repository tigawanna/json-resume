import { z } from "zod";

export const ADMIN_EVENT_SORT_COLUMNS = [
  "seq",
  "when",
  "user",
  "collection",
  "type",
  "applied",
] as const;
export type AdminEventSortColumn = (typeof ADMIN_EVENT_SORT_COLUMNS)[number];
export type AdminEventSort = `${AdminEventSortColumn}-${"asc" | "desc"}`;

export const ADMIN_EVENT_SORTS = [
  "seq-desc",
  "seq-asc",
  "when-desc",
  "when-asc",
  "user-desc",
  "user-asc",
  "collection-desc",
  "collection-asc",
  "type-desc",
  "type-asc",
  "applied-desc",
  "applied-asc",
] as const satisfies readonly AdminEventSort[];
export const ADMIN_EVENT_TYPES = ["insert", "update", "delete"] as const;

export const adminEventFilterSchema = z.object({
  userId: z.string().optional(),
  q: z.string().optional(),
  type: z.enum(ADMIN_EVENT_TYPES).optional(),
  applied: z.enum(["yes", "no"]).optional(),
});

export const adminEventListSchema = adminEventFilterSchema.extend({
  collectionId: z.string().optional(),
  sort: z.enum(ADMIN_EVENT_SORTS),
  page: z.number().int().min(0),
  pageSize: z.number().int().min(1).max(200),
});
