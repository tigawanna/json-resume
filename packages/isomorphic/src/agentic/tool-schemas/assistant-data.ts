import { z } from "zod";

/** Collections the assistant may read. Résumé documents and settings are not here. */
export const QUERY_COLLECTIONS = [
  "resumeExperience",
  "resumeExperienceBullet",
  "resumeEducation",
  "resumeEducationBullet",
  "resumeSkillGroup",
  "resumeSkill",
  "resumeContact",
  "resumeProject",
  "resumeSummary",
  "resumeNote",
  "resumeLink",
  "resumeLanguage",
  "resumeCertification",
  "resumeVolunteer",
  "resumeTalk",
  "savedProject",
  "job",
  "coverLetter",
  "applicationAnswer",
  "assistantSkill",
] as const;

/** Experience bullets stay on the experience tools. The rest of the query list can be written. */
export const MUTATE_COLLECTIONS = QUERY_COLLECTIONS.filter(
  (name) => name !== "resumeExperienceBullet",
);

export type QueryCollection = (typeof QUERY_COLLECTIONS)[number];
export type MutateCollection = (typeof MUTATE_COLLECTIONS)[number];

const scalarValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const queryCollectionToolInputSchema = z.object({
  collection: z.enum(QUERY_COLLECTIONS),
  id: z.string().trim().min(1).optional(),
  keyword: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
  offset: z.number().int().min(0).optional(),
});

export const queryCollectionToolOutputSchema = z.object({
  collection: z.enum(QUERY_COLLECTIONS),
  items: z.array(z.record(z.string(), scalarValue)),
  total: z.number(),
  nextOffset: z.number().nullable(),
});

export const mutateCollectionToolInputSchema = z.object({
  collection: z.enum(MUTATE_COLLECTIONS),
  op: z.enum(["insert", "update", "delete"]),
  id: z.string().trim().min(1).optional(),
  /**
   * Fields for that collection, with id, userId, and timestamps left out.
   * Unknown keys fail. Update sends only the fields that change.
   */
  values: z.record(z.string(), z.union([scalarValue, z.array(z.string())])).optional(),
});

export const mutateCollectionToolOutputSchema = z.object({
  collection: z.enum(MUTATE_COLLECTIONS),
  op: z.enum(["insert", "update", "delete"]),
  id: z.string(),
  title: z.string(),
});

export const searchConversationsToolInputSchema = z.object({
  keyword: z.string().optional(),
  routeKey: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional(),
  /** When set, return a short excerpt of this conversation instead of the list. */
  conversationId: z.string().optional(),
});

export const searchConversationsToolOutputSchema = z.object({
  conversations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      routeLabel: z.string(),
      routeKey: z.string(),
      updatedAt: z.number(),
      preview: z.string(),
    }),
  ),
  excerpt: z.array(z.object({ role: z.string(), text: z.string() })).optional(),
});
