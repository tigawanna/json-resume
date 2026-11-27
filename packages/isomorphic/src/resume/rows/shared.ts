import { z } from "zod";

export const timestampsSchema = z.object({
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const embeddableSchema = z.object({
  searchableText: z.string(),
  embedding: z.array(z.number()).nullable().optional(),
  embeddingModel: z.string().nullable().optional(),
});
