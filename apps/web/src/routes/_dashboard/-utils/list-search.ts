import { z } from "zod";

/** Shared `q` + `page` + TanStack DB sort + column-visibility contract. */
export const eventSourcedListSearchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  /** Comma-separated `ResponsiveColumn.id` values to hide. */
  hidden: z.string().optional(),
});

export type EventSourcedListSearch = z.infer<typeof eventSourcedListSearchSchema>;

/**
 * Lists that can be narrowed to what one or more résumés use. Declaring
 * `resumeIds` and passing `resumeFilter` to `EventSourcedListScaffold` is all a
 * list needs for the picker; it reads the ids back through `useResumeFilter`.
 */
export const resumeFilteredListSearchSchema = eventSourcedListSearchSchema.extend({
  /** Most recently picked first. */
  resumeIds: z.array(z.string()).optional().catch(undefined),
});

export const eventQueueTabSchema = z.enum(["outbox", "inbox", "deadletter"]);
export type EventQueueTab = z.infer<typeof eventQueueTabSchema>;

export const eventQueueSearchSchema = eventSourcedListSearchSchema.extend({
  tab: eventQueueTabSchema.optional(),
});

export type EventQueueSearch = z.infer<typeof eventQueueSearchSchema>;
