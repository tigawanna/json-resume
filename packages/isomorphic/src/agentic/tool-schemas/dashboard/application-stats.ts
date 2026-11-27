import { z } from "zod";
import { jobStatusToolSchema } from "../resume/job.ts";

const statusCountsSchema = z.object({
  saved: z.number().int(),
  applied: z.number().int(),
  interviewing: z.number().int(),
  offer: z.number().int(),
  rejected: z.number().int(),
  archived: z.number().int(),
}) satisfies z.ZodType<Record<z.infer<typeof jobStatusToolSchema>, number>>;

export const getApplicationStatsToolInputSchema = z.object({
  months: z
    .number()
    .int()
    .min(1)
    .max(24)
    .default(6)
    .describe("How many recent calendar months the monthly breakdown covers."),
});

export const getApplicationStatsToolOutputSchema = z.object({
  today: z.string().describe("Today's date (YYYY-MM-DD), for relative wording."),
  totalJobs: z.number().int(),
  byStatus: statusCountsSchema,
  applied: z
    .number()
    .int()
    .describe(
      "Jobs the user applied to: an apply date, or status applied, interviewing, offer or rejected.",
    ),
  interviewRate: z
    .number()
    .describe("Share of applied jobs that reached interviewing or offer, 0 to 1."),
  offerRate: z.number().describe("Share of applied jobs that reached an offer, 0 to 1."),
  perMonth: z
    .array(
      z.object({
        month: z.string().describe("YYYY-MM"),
        applied: z.number().int().describe("Applications sent that month (by apply date)."),
        saved: z.number().int().describe("Jobs added to the tracker that month."),
      }),
    )
    .describe("Oldest month first."),
  jobsWithoutResume: z.number().int().describe("Tracked jobs no résumé targets yet."),
  recent: z
    .array(
      z.object({
        jobId: z.string(),
        label: z.string(),
        status: jobStatusToolSchema,
        appliedAt: z.string().nullable(),
        updatedAt: z.string(),
      }),
    )
    .describe("The most recently updated jobs."),
});

export type GetApplicationStatsToolInput = z.input<typeof getApplicationStatsToolInputSchema>;
export type GetApplicationStatsToolOutput = z.infer<typeof getApplicationStatsToolOutputSchema>;
