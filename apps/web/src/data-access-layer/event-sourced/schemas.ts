import { z } from "zod";

/**
 * Zod row shapes mirroring `apps/web/src/lib/drizzle/scheam` resume + saved_project tables.
 * Types are inferred from these schemas — auth tables are intentionally omitted.
 *
 * Timestamps are epoch ms (`number`) for JSON-friendly local-first storage
 * (Drizzle uses `timestamp_ms` Date mode on the server).
 * Embeddings are `number[] | null` (F32 floats) instead of SQLite blobs.
 */

export const timestampsSchema = z.object({
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const embeddableSchema = z.object({
  searchableText: z.string(),
  embedding: z.array(z.number()).nullable().optional(),
  embeddingModel: z.string().nullable().optional(),
});

export const listTablePrefsSchema = z.object({
  hidden: z.string().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
});
export type ListTablePrefs = z.infer<typeof listTablePrefsSchema>;

/** Persisted app prefs for the event-sourced DB (not a Drizzle table). */
export const appSettingsSchema = z.object({
  id: z.string(),
  theme: z.enum(["light", "dark"]),
  language: z.string(),
  syncEnabled: z.boolean(),
  aiModel: z.string().optional(),
  aiApiKey: z.string().optional(),
  aiSystemPrompt: z.string().optional(),
  /** Column visibility + sort per list route (e.g. `resumes`). */
  listTablePrefs: z.record(z.string(), listTablePrefsSchema).optional(),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

// --- resume ---

export const resumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  fullName: z.string(),
  headline: z.string(),
  description: z.string(),
  jobDescription: z.string(),
  /** Linked row in the independent `job` collection, if any. */
  jobId: z.string().nullable().optional(),
  templateId: z.string(),
  experienceOrder: z.array(z.string()).optional(),
  educationOrder: z.array(z.string()).optional(),
  projectOrder: z.array(z.string()).optional(),
  talkOrder: z.array(z.string()).optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type Resume = z.infer<typeof resumeSchema>;

export const resumeSectionSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  key: z.string(),
  title: z.string(),
  enabled: z.boolean(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeSection = z.infer<typeof resumeSectionSchema>;

// --- experience ---

export const resumeExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeExperience = z.infer<typeof resumeExperienceSchema>;

export const resumeExperienceItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  experienceId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeExperienceItem = z.infer<typeof resumeExperienceItemSchema>;

export const resumeExperienceBulletSchema = z.object({
  id: z.string(),
  experienceId: z.string(),
  text: z.string(),
  sortOrder: z.number(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeExperienceBullet = z.infer<typeof resumeExperienceBulletSchema>;

// --- education ---

export const resumeEducationSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeEducation = z.infer<typeof resumeEducationSchema>;

export const resumeEducationItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  educationId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeEducationItem = z.infer<typeof resumeEducationItemSchema>;

export const resumeEducationBulletSchema = z.object({
  id: z.string(),
  educationId: z.string(),
  text: z.string(),
  sortOrder: z.number(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeEducationBullet = z.infer<typeof resumeEducationBulletSchema>;

// --- skills ---

export const resumeSkillGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeSkillGroup = z.infer<typeof resumeSkillGroupSchema>;

export const resumeSkillGroupItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  groupId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeSkillGroupItem = z.infer<typeof resumeSkillGroupItemSchema>;

export const resumeSkillSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  level: z.string().nullable().optional(),
  sortOrder: z.number(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeSkill = z.infer<typeof resumeSkillSchema>;

// --- contact ---

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

export const resumeContactItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  contactId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeContactItem = z.infer<typeof resumeContactItemSchema>;

// --- project ---

export const resumeProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  homepageUrl: z.string(),
  description: z.string(),
  /** JSON string array of technologies, e.g. '["React","TypeScript"]' */
  tech: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeProject = z.infer<typeof resumeProjectSchema>;

export const resumeProjectItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  projectId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeProjectItem = z.infer<typeof resumeProjectItemSchema>;

// --- summary ---

export const resumeSummarySchema = z.object({
  id: z.string(),
  text: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeSummary = z.infer<typeof resumeSummarySchema>;

export const resumeSummaryItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  summaryId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeSummaryItem = z.infer<typeof resumeSummaryItemSchema>;

// --- notes (footer copy: cover letter, addendum, …) ---

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

export const resumeNoteItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  noteId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeNoteItem = z.infer<typeof resumeNoteItemSchema>;

// --- link ---

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

export const resumeLinkItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  linkId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeLinkItem = z.infer<typeof resumeLinkItemSchema>;

// --- language ---

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

export const resumeLanguageItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  languageId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeLanguageItem = z.infer<typeof resumeLanguageItemSchema>;

// --- certification ---

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

export const resumeCertificationItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  certificationId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeCertificationItem = z.infer<typeof resumeCertificationItemSchema>;

// --- volunteer ---

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

export const resumeVolunteerItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  volunteerId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeVolunteerItem = z.infer<typeof resumeVolunteerItemSchema>;

// --- talk ---

export const resumeTalkSchema = z.object({
  id: z.string(),
  title: z.string(),
  event: z.string(),
  date: z.string(),
  description: z.string(),
  /** JSON array of {label, url} objects */
  links: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeTalk = z.infer<typeof resumeTalkSchema>;

export const resumeTalkItemSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  talkId: z.string(),
  sortOrder: z.number(),
  ...timestampsSchema.shape,
});
export type ResumeTalkItem = z.infer<typeof resumeTalkItemSchema>;

// --- AI chat ---

export const resumeAiChatSchema = z.object({
  id: z.string(),
  userId: z.string(),
  resumeId: z.string(),
  messages: z.string(),
  ...timestampsSchema.shape,
});
export type ResumeAiChat = z.infer<typeof resumeAiChatSchema>;

export const resumeAiConversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  resumeId: z.string(),
  title: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  ...timestampsSchema.shape,
});
export type ResumeAiConversation = z.infer<typeof resumeAiConversationSchema>;

export const resumeAiMessageRoleSchema = z.enum(["system", "user", "assistant"]);

export const resumeAiMessageSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  conversationId: z.string(),
  role: resumeAiMessageRoleSchema,
  position: z.number(),
  textContent: z.string(),
  parts: z.string(),
  ...timestampsSchema.shape,
});
export type ResumeAiMessage = z.infer<typeof resumeAiMessageSchema>;

// --- job (independent tracker: postings you saved / applied to) ---

export const jobStatusSchema = z.enum([
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  company: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  location: z.string(),
  status: jobStatusSchema,
  notes: z.string(),
  appliedAt: z.number().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type Job = z.infer<typeof jobSchema>;

// --- saved project ---

export const savedProjectSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  url: z.string(),
  homepageUrl: z.string(),
  description: z.string(),
  tech: z.string(),
  searchableText: z.string(),
  embedding: z.array(z.number()).nullable().optional(),
  embeddingDimensions: z.number().nullable().optional(),
  ...timestampsSchema.shape,
});
export type SavedProject = z.infer<typeof savedProjectSchema>;
