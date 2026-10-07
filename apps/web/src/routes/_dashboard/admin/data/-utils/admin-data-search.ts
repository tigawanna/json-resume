import { ADMIN_EVENT_SORTS, ADMIN_EVENT_TYPES } from "@/modules/admin/admin-event-filters";
import { z } from "zod";

export const adminDataSearchSchema = z.object({
  tab: z.enum(["events", "collections", "users"]).catch("events"),
  userId: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  collectionId: z.string().optional().catch(undefined),
  type: z.enum(ADMIN_EVENT_TYPES).optional().catch(undefined),
  applied: z.enum(["yes", "no"]).optional().catch(undefined),
  sort: z.enum(ADMIN_EVENT_SORTS).catch("seq-desc"),
  page: z.number().int().min(0).catch(0),
});

export type AdminDataSearch = z.infer<typeof adminDataSearchSchema>;
