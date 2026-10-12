import { z } from "zod";
import { jobStatusToolSchema } from "./resume-tool-schemas";

export const startResumeModeSchema = z.enum(["reuse", "copy"]);

export const startResumeForJobToolInputSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1)
    .describe("Tracked job the résumé is for (save it with save_job first)."),
  resumeId: z
    .string()
    .trim()
    .min(1)
    .describe('With "reuse", the résumé to open as it is. With "copy", the résumé to copy from.'),
  mode: startResumeModeSchema.describe(
    '"reuse" when the résumé already fits the job and needs no new draft; "copy" for a new draft based on it.',
  ),
  reason: z
    .string()
    .trim()
    .min(1)
    .max(600)
    .describe(
      "One or two sentences for the approval card: why this résumé, and why reuse or copy it.",
    ),
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .describe('Name for the copy. Defaults to "<résumé> for <job>". Ignored with "reuse".'),
  suggestedPrompt: z
    .string()
    .trim()
    .min(1)
    .max(600)
    .describe(
      "The first instruction for the résumé editor's assistant, written as the user would type it, e.g. \"Tailor the summary and bullets to this job and cover the missing keywords: Kafka, gRPC.\" It is put in the editor's composer for the user to send.",
    ),
});

export const startResumeForJobToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  mode: startResumeModeSchema,
  baseResumeId: z.string().describe("The résumé that was reused or copied."),
  jobId: z.string(),
  jobAttached: z
    .boolean()
    .describe(
      "False when a reused résumé already targets another job and was left pointing at it.",
    ),
  opensAfterReply: z.literal(true),
});

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

export const getProfileOverviewToolInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(5)
    .max(50)
    .default(20)
    .describe("Maximum entries per list (skills, technologies, experiences)."),
});

const usageCountSchema = z.object({
  name: z.string(),
  count: z.number().int(),
});

export const getProfileOverviewToolOutputSchema = z.object({
  counts: z.object({
    resumes: z.number().int(),
    experiences: z.number().int(),
    projects: z.number().int(),
    education: z.number().int(),
    skills: z.number().int(),
    certifications: z.number().int(),
    talks: z.number().int(),
    jobs: z.number().int(),
    coverLetters: z.number().int(),
    applicationAnswers: z.number().int(),
  }),
  yearsOfExperience: z
    .number()
    .nullable()
    .describe("Years covered by experience dates, overlaps merged. Null when no dates parse."),
  experiences: z
    .array(
      z.object({
        company: z.string(),
        role: z.string(),
        startDate: z.string(),
        endDate: z.string().describe("Empty when current."),
      }),
    )
    .describe("Most recent first."),
  headlines: z.array(z.string()).describe("Distinct résumé headlines, newest résumé first."),
  topSkills: z.array(usageCountSchema).describe("Skills by how many résumés show them."),
  topTechnologies: z.array(usageCountSchema).describe("Project technologies by project count."),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      field: z.string(),
      endDate: z.string(),
    }),
  ),
});

export type StartResumeForJobToolInput = z.input<typeof startResumeForJobToolInputSchema>;
export type StartResumeForJobToolOutput = z.infer<typeof startResumeForJobToolOutputSchema>;
export type GetApplicationStatsToolInput = z.input<typeof getApplicationStatsToolInputSchema>;
export type GetApplicationStatsToolOutput = z.infer<typeof getApplicationStatsToolOutputSchema>;
export type GetProfileOverviewToolInput = z.input<typeof getProfileOverviewToolInputSchema>;
export type GetProfileOverviewToolOutput = z.infer<typeof getProfileOverviewToolOutputSchema>;
