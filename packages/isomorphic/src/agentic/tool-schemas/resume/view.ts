import { z } from "zod";
import { SECTION_KEYS } from "../../../resume/schema.ts";
import { jobStatusToolSchema } from "./job.ts";

export const resumeViewSectionSchema = z.enum([...SECTION_KEYS, "job"]);

export const idTextSchema = z.object({ id: z.string(), text: z.string() });

export const skillGroupViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  skills: z.array(z.object({ id: z.string(), name: z.string() })),
});

const linkPairSchema = z.object({ label: z.string(), url: z.string() });

export const experienceViewSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  bullets: z.array(idTextSchema),
});

export const educationViewSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  bullets: z.array(idTextSchema),
});

export const projectViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tech: z.array(z.string()),
  url: z.string(),
  homepageUrl: z.string(),
});

export const talkViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  event: z.string(),
  date: z.string(),
  description: z.string(),
  links: z.array(linkPairSchema),
});

export const resumeViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  templateId: z.string(),
  updatedAt: z.string(),
  sectionOrder: z.array(z.enum(SECTION_KEYS)),
  hiddenSections: z.array(z.enum(SECTION_KEYS)),
  job: z
    .object({
      id: z.string(),
      company: z.string(),
      title: z.string(),
      status: jobStatusToolSchema,
      location: z.string(),
      payRate: z.string(),
      url: z.string(),
      description: z.string().optional(),
    })
    .nullable(),
  header: z
    .object({
      fullName: z.string(),
      headline: z.string(),
      contacts: z.array(
        z.object({ id: z.string(), type: z.string(), value: z.string(), label: z.string() }),
      ),
      links: z.array(z.object({ id: z.string(), label: z.string(), url: z.string() })),
    })
    .optional(),
  summary: z.array(idTextSchema).optional(),
  experience: z.array(experienceViewSchema).optional(),
  education: z.array(educationViewSchema).optional(),
  projects: z.array(projectViewSchema).optional(),
  talks: z.array(talkViewSchema).optional(),
  skills: z.array(skillGroupViewSchema).optional(),
  notes: z.array(z.object({ id: z.string(), label: z.string(), text: z.string() })).optional(),
});

export const getResumeToolOutputSchema = z.object({ resume: resumeViewSchema });

export type ResumeView = z.infer<typeof resumeViewSchema>;
export type ResumeViewSection = z.infer<typeof resumeViewSectionSchema>;
export type GetResumeToolOutput = z.infer<typeof getResumeToolOutputSchema>;
