import { z } from "zod";

/** Search + paging fields shared by every list/search tool input. */
export const searchPageInputShape = {
  keyword: z
    .string()
    .trim()
    .optional()
    .describe("Space-separated words. Every word must appear in some field. Omit to list all."),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0).describe("Pass the previous nextOffset to page."),
};

/** Paging fields shared by every list/search tool output. */
export const searchPageOutputShape = {
  total: z.number().int().describe("Matches before paging."),
  nextOffset: z
    .number()
    .int()
    .nullable()
    .describe("Offset of the next page, or null when every match was returned."),
};
