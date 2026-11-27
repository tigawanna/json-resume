import { z } from "zod";
import { embeddableSchema, timestampsSchema } from "./shared.ts";

export const resumeContactSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.string(),
  label: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeContact = z.infer<typeof resumeContactSchema>;

export const resumeLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeLink = z.infer<typeof resumeLinkSchema>;

export const resumeSummarySchema = z.object({
  id: z.string(),
  text: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeSummary = z.infer<typeof resumeSummarySchema>;

export const resumeNoteSchema = z.object({
  id: z.string(),
  label: z.string(),
  text: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeNote = z.infer<typeof resumeNoteSchema>;

export const resumeProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  homepageUrl: z.string(),
  description: z.string(),
  /** JSON string array of technologies, e.g. '["React","TypeScript"]'. */
  tech: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeProject = z.infer<typeof resumeProjectSchema>;

export const resumeLanguageSchema = z.object({
  id: z.string(),
  name: z.string(),
  proficiency: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeLanguage = z.infer<typeof resumeLanguageSchema>;

export const resumeCertificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  url: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeCertification = z.infer<typeof resumeCertificationSchema>;

export const resumeVolunteerSchema = z.object({
  id: z.string(),
  organization: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeVolunteer = z.infer<typeof resumeVolunteerSchema>;

export const resumeTalkSchema = z.object({
  id: z.string(),
  title: z.string(),
  event: z.string(),
  date: z.string(),
  description: z.string(),
  /** JSON array of { label, url } objects. */
  links: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeTalk = z.infer<typeof resumeTalkSchema>;
