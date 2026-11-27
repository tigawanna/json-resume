import { z } from "zod";

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

export type GetProfileOverviewToolInput = z.input<typeof getProfileOverviewToolInputSchema>;
export type GetProfileOverviewToolOutput = z.infer<typeof getProfileOverviewToolOutputSchema>;
