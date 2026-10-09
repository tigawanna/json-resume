import {
  resumeDocumentV1Schema,
  SECTION_KEYS,
  TEMPLATE_IDS,
} from "@/features/resume/resume-schema";
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

export const listResumesToolInputSchema = z.object(searchPageInputShape);

export const setActiveResumeToolInputSchema = z.object({
  resumeId: z.string().trim().min(1),
});

export const setActiveResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
});

export const replaceResumeDocumentToolOutputSchema = z.object({
  resumeId: z.string(),
  updatedAt: z.string(),
});

export const resumeListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  headline: z.string(),
  description: z.string(),
  templateId: z.string(),
  jobId: z.string().nullable(),
  jobLabel: z.string().describe("Company and title of the target job, or empty when none."),
  updatedAt: z.string(),
});

export const listResumesToolOutputSchema = z.object({
  resumes: z.array(resumeListItemSchema),
  ...searchPageOutputShape,
});

export const jobStatusToolSchema = z.enum([
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
]);

export const resumeViewSectionSchema = z.enum([...SECTION_KEYS, "job"]);

export const getResumeToolInputSchema = z.object({
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé to read. Defaults to the active résumé in the app."),
  sections: z
    .array(resumeViewSectionSchema)
    .min(1)
    .optional()
    .describe(
      'Only return these sections to keep the payload small. "job" adds the linked job description. Omit for everything.',
    ),
});

const idTextSchema = z.object({ id: z.string(), text: z.string() });

const skillGroupViewSchema = z.object({
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

// ─── Résumé writes (client only) ─────────────────────────────────────────────

const targetResumeShape = {
  resumeId: z.string().trim().optional().describe("Résumé to edit. Defaults to the active résumé."),
};

export const updateResumeDetailsToolInputSchema = z.object({
  ...targetResumeShape,
  name: z.string().trim().min(1).max(120).optional().describe("Internal name in the résumé list."),
  fullName: z.string().trim().max(200).optional(),
  headline: z.string().trim().max(300).optional(),
  description: z.string().trim().max(800).optional(),
  templateId: z.enum(TEMPLATE_IDS).optional(),
});

export const updateResumeDetailsToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  fullName: z.string(),
  headline: z.string(),
  description: z.string(),
  templateId: z.enum(TEMPLATE_IDS),
});

export const setSummaryToolInputSchema = z.object({
  ...targetResumeShape,
  text: z.string().trim().max(2_000).describe("The new summary. Empty clears it."),
});

export const setSummaryToolOutputSchema = z.object({
  resumeId: z.string(),
  summary: idTextSchema.nullable(),
});

export const setExperienceBulletsToolInputSchema = z.object({
  ...targetResumeShape,
  experienceId: z.string().trim().min(1).describe("Experience id from get_resume."),
  bullets: z
    .array(z.string().trim().min(1).max(600))
    .max(12)
    .describe("Every bullet this experience should show, in order. Unchanged wording is reused."),
});

export const setExperienceBulletsToolOutputSchema = z.object({
  resumeId: z.string(),
  experienceId: z.string(),
  bullets: z.array(idTextSchema),
});

export const setSkillsToolInputSchema = z.object({
  ...targetResumeShape,
  groups: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        skills: z.array(z.string().trim().min(1).max(80)).max(40),
      }),
    )
    .max(12)
    .describe("Replaces every skill group on the résumé, in this order."),
});

export const setSkillsToolOutputSchema = z.object({
  resumeId: z.string(),
  skills: z.array(skillGroupViewSchema),
});

export const removableSectionSchema = z.enum([
  "summary",
  "experience",
  "education",
  "projects",
  "talks",
  "skills",
  "notes",
  "contacts",
  "links",
]);

export const removeFromResumeToolInputSchema = z.object({
  ...targetResumeShape,
  section: removableSectionSchema,
  itemId: z
    .string()
    .trim()
    .min(1)
    .describe("Item id from get_resume (a skill group id for skills). The library row is kept."),
});

const upsertIdShape = {
  id: z
    .string()
    .trim()
    .optional()
    .describe(
      "Library id to edit (from get_resume or search). Omit to create; an identical existing item is reused.",
    ),
};

const shortText = z.string().trim().max(200);

export const upsertExperienceToolInputSchema = z.object({
  ...targetResumeShape,
  ...upsertIdShape,
  company: shortText.optional().describe("Required when creating."),
  role: shortText.optional().describe("Required when creating."),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional().describe('Empty or "Present" for a current role.'),
  location: shortText.optional(),
  bullets: z
    .array(z.string().trim().min(1).max(600))
    .max(12)
    .optional()
    .describe("When given, the bullets this experience shows on the résumé, in order."),
});

export const upsertProjectToolInputSchema = z.object({
  ...targetResumeShape,
  ...upsertIdShape,
  name: shortText.optional().describe("Required when creating."),
  description: z.string().trim().max(2_000).optional(),
  tech: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  url: z.string().trim().max(2_000).optional(),
  homepageUrl: z.string().trim().max(2_000).optional(),
});

export const upsertEducationToolInputSchema = z.object({
  ...targetResumeShape,
  ...upsertIdShape,
  school: shortText.optional().describe("Required when creating."),
  degree: shortText.optional(),
  field: shortText.optional(),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
  description: z.string().trim().max(2_000).optional(),
});

export const upsertTalkToolInputSchema = z.object({
  ...targetResumeShape,
  ...upsertIdShape,
  title: shortText.optional().describe("Required when creating."),
  event: shortText.optional(),
  date: z.string().trim().max(40).optional(),
  description: z.string().trim().max(2_000).optional(),
  links: z
    .array(z.object({ label: shortText, url: z.string().trim().max(2_000) }))
    .max(10)
    .optional(),
});

const upsertOutputShape = {
  resumeId: z.string(),
  created: z.boolean().describe("True when a new library item was inserted."),
};

export const upsertExperienceToolOutputSchema = z.object({
  ...upsertOutputShape,
  experience: experienceViewSchema,
});
export const upsertProjectToolOutputSchema = z.object({
  ...upsertOutputShape,
  project: projectViewSchema,
});
export const upsertEducationToolOutputSchema = z.object({
  ...upsertOutputShape,
  education: educationViewSchema,
});
export const upsertTalkToolOutputSchema = z.object({ ...upsertOutputShape, talk: talkViewSchema });

export const replaceResumeDocumentToolInputSchema = z.object({
  ...targetResumeShape,
  document: resumeDocumentV1Schema,
});

export const removeFromResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  section: removableSectionSchema,
  itemId: z.string(),
  removed: z.boolean().describe("False when the item was not on the résumé."),
});

// ─── Jobs ─────────────────────────────────────────────────────────────────────

const jobFieldsShape = {
  company: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  url: z.string().trim().max(2_000).optional(),
  location: z.string().trim().max(200).optional(),
  status: jobStatusToolSchema.optional(),
  notes: z.string().trim().max(4_000).optional(),
};

const jobDescriptionSchema = z.string().trim().min(1).max(40_000);

export const jobRowSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string(),
  status: jobStatusToolSchema,
  url: z.string(),
  notes: z.string(),
  descriptionPreview: z.string(),
  linkedResumeIds: z.array(z.string()).describe("Résumés that target this job."),
  updatedAt: z.string(),
});

export const jobDetailSchema = jobRowSchema
  .omit({ descriptionPreview: true })
  .extend({ description: z.string() });

export const saveJobToolInputSchema = z.object({
  description: jobDescriptionSchema.describe("The full posting text."),
  ...jobFieldsShape,
  attachToResumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé that should target this job. Omit to only save it to the tracker."),
});

export const saveJobToolOutputSchema = z.object({
  job: jobRowSchema,
  created: z.boolean().describe("False when a job with the same posting text was updated."),
  attachedToResumeId: z.string().nullable(),
});

export const updateJobToolInputSchema = z.object({
  jobId: z.string().trim().min(1),
  description: jobDescriptionSchema.optional(),
  ...jobFieldsShape,
});

export const updateJobToolOutputSchema = z.object({ job: jobRowSchema });

export const getJobToolInputSchema = z.object({
  jobId: z.string().trim().optional().describe("Omit to read the job a résumé targets."),
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé whose job to read when jobId is omitted. Defaults to the active résumé."),
});

export const getJobToolOutputSchema = z.object({ job: jobDetailSchema });

export const listJobsToolInputSchema = z.object({
  ...searchPageInputShape,
  status: jobStatusToolSchema.optional(),
});

export const listJobsToolOutputSchema = z.object({
  jobs: z.array(jobRowSchema),
  ...searchPageOutputShape,
});

export const attachJobToolInputSchema = z.object({
  ...targetResumeShape,
  jobId: z.string().trim().min(1).nullable().describe("Job to target, or null to detach."),
});

export const attachJobToolOutputSchema = z.object({
  resumeId: z.string(),
  job: jobRowSchema.nullable(),
});

// ─── Résumé lifecycle and ranking ─────────────────────────────────────────────

export const workbenchTabSchema = z.enum(["edit", "preview", "json", "prompt", "ai"]);

const makeActiveSchema = z
  .boolean()
  .default(true)
  .describe("Make the new résumé the active one so follow-up edits land on it.");

export const cloneResumeToolInputSchema = z.object({
  sourceResumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé to copy. Defaults to the active résumé."),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(800).optional(),
  jobId: z
    .string()
    .trim()
    .optional()
    .describe("Tracked job the copy should target. Omit to keep the source's job."),
  makeActive: makeActiveSchema,
});

export const cloneResumeToolOutputSchema = z.object({
  sourceResumeId: z.string(),
  resumeId: z.string(),
  name: z.string(),
  jobId: z.string().nullable(),
  active: z.boolean(),
});

export const createResumeToolInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(800).optional(),
  jobId: z.string().trim().optional().describe("Tracked job the résumé should target."),
  document: resumeDocumentV1Schema
    .optional()
    .describe(
      "A complete parsed résumé, for importing pasted résumé text. Omit for a blank résumé and fill it with the setters and upserts.",
    ),
  makeActive: makeActiveSchema,
});

export const createResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  active: z.boolean(),
});

export const openResumeToolInputSchema = z.object({
  resumeId: z.string().trim().optional().describe("Defaults to the active résumé."),
  tab: workbenchTabSchema.default("ai").describe('"ai" keeps this conversation in view.'),
});

export const openResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  tab: workbenchTabSchema,
  opensAfterReply: z
    .boolean()
    .describe("The editor switches once this reply finishes; the conversation moves with it."),
});

const rankedResumeSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  jobId: z.string().nullable(),
  score: z.number().describe("Share of the job's keywords the résumé covers, 0 to 1."),
  matchedTerms: z.array(z.string()),
  missingTerms: z.array(z.string()).describe("Most frequent job keywords the résumé lacks."),
});

export const rankResumesForJobToolInputSchema = z.object({
  jobId: z.string().trim().optional().describe("Tracked job. Defaults to the active résumé's job."),
  jobText: z
    .string()
    .trim()
    .max(40_000)
    .optional()
    .describe("Posting text to rank against when the job is not tracked."),
  limit: z.number().int().min(1).max(20).default(5),
});

export const rankResumesForJobToolOutputSchema = z.object({
  jobId: z.string().nullable(),
  keywords: z.array(z.string()).describe("The job keywords résumés were scored on."),
  results: z.array(rankedResumeSchema),
});

export const tailorResumeForJobToolInputSchema = z.object({
  jobId: z.string().trim().min(1).describe("Tracked job (save it with save_job first)."),
  baseResumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé to start from. Defaults to the best match for the job."),
  name: z.string().trim().min(1).max(120).optional(),
});

export const tailorResumeForJobToolOutputSchema = z.object({
  jobId: z.string(),
  baseResumeId: z.string(),
  resumeId: z.string(),
  name: z.string(),
  score: z.number(),
  missingTerms: z.array(z.string()),
  resume: resumeViewSchema,
});

// ─── Library ──────────────────────────────────────────────────────────────────

export const librarySectionSchema = z.enum([
  "summary",
  "experience",
  "experience_bullet",
  "education",
  "projects",
  "talks",
  "skills",
]);

export const libraryHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  experienceId: z
    .string()
    .nullable()
    .describe("For experience_bullet: the experience it belongs to."),
  onResume: z.boolean().describe("Already shown on the target résumé."),
});

export const searchLibraryToolInputSchema = z.object({
  section: librarySectionSchema.describe("One library section per call."),
  ...searchPageInputShape,
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé used for onResume. Defaults to the active résumé in the app."),
  notOnResume: z
    .boolean()
    .default(false)
    .describe("Only return items the target résumé does not show yet."),
});

export const searchLibraryToolOutputSchema = z.object({
  section: librarySectionSchema,
  resumeId: z.string().nullable(),
  items: z.array(libraryHitSchema),
  ...searchPageOutputShape,
});

export const attachableSectionSchema = z.enum([
  "experience",
  "experience_bullet",
  "education",
  "projects",
  "talks",
]);

export const attachLibraryItemsToolInputSchema = z.object({
  ...targetResumeShape,
  section: attachableSectionSchema,
  ids: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(30)
    .describe(
      "Library ids from search_library. Experiences arrive with all their bullets; a bullet joins its experience.",
    ),
});

export const attachLibraryItemsToolOutputSchema = z.object({
  resumeId: z.string(),
  section: attachableSectionSchema,
  attachedIds: z.array(z.string()),
  alreadyOnResume: z.array(z.string()),
});

export const rankedLibraryItemSchema = libraryHitSchema.extend({
  section: librarySectionSchema,
  score: z.number().int().describe("How many job keywords the item mentions."),
  matchedTerms: z.array(z.string()),
});

export const rankLibraryForJobToolInputSchema = z.object({
  jobId: z.string().trim().optional().describe("Tracked job. Defaults to the active résumé's job."),
  jobText: z.string().trim().max(20_000).optional().describe("Posting text, instead of jobId."),
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé to fill. Defaults to the active résumé in the app."),
  sections: z.array(librarySectionSchema).min(1).optional().describe("Defaults to every section."),
  includeOnResume: z.boolean().default(false),
  limit: z.number().int().min(1).max(30).default(10),
});

export const rankLibraryForJobToolOutputSchema = z.object({
  jobId: z.string().nullable(),
  resumeId: z.string().nullable(),
  keywords: z.array(z.string()),
  results: z.array(rankedLibraryItemSchema),
});

export const reorderableSectionSchema = z.enum([
  "experience",
  "education",
  "projects",
  "talks",
  "skills",
  "contacts",
  "links",
]);

export const reorderSectionToolInputSchema = z.object({
  ...targetResumeShape,
  section: reorderableSectionSchema,
  ids: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(60)
    .describe(
      "Item ids from get_resume in the new order (skill group ids for skills). Unlisted items keep their order after these.",
    ),
});

export const reorderSectionToolOutputSchema = z.object({
  resumeId: z.string(),
  section: reorderableSectionSchema,
  ids: z.array(z.string()),
});

const contactViewSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.string(),
  label: z.string(),
});

export const setContactsToolInputSchema = z.object({
  ...targetResumeShape,
  contacts: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(40).describe("email, phone, location, website, …"),
        value: z.string().trim().min(1).max(300),
        label: z.string().trim().max(80).optional(),
      }),
    )
    .max(12)
    .describe("Every contact the header should show, in order."),
});

export const setContactsToolOutputSchema = z.object({
  resumeId: z.string(),
  contacts: z.array(contactViewSchema),
});

const linkViewSchema = z.object({ id: z.string(), label: z.string(), url: z.string() });

export const setLinksToolInputSchema = z.object({
  ...targetResumeShape,
  links: z
    .array(
      z.object({ label: z.string().trim().min(1).max(80), url: z.string().trim().min(1).max(500) }),
    )
    .max(12)
    .describe("Every header link, in order."),
});

export const setLinksToolOutputSchema = z.object({
  resumeId: z.string(),
  links: z.array(linkViewSchema),
});

export const setNotesToolInputSchema = z.object({
  ...targetResumeShape,
  label: z.string().trim().max(80).optional().describe('Heading, "Notes" by default.'),
  text: z.string().trim().max(6_000).describe("Cover-letter or extra notes. Empty clears them."),
});

export const setNotesToolOutputSchema = z.object({
  resumeId: z.string(),
  notes: z.object({ id: z.string(), label: z.string(), text: z.string() }).nullable(),
});

// ─── Assistant (playbooks, undo) ──────────────────────────────────────────────

export const playbookNameSchema = z.enum([
  "edit_resume",
  "pasted_job",
  "tailored_copy",
  "fill_from_library",
  "import_resume",
]);

export const getPlaybookToolInputSchema = z.object({
  name: playbookNameSchema.describe("The workflow to read the steps for."),
});

export const getPlaybookToolOutputSchema = z.object({
  name: playbookNameSchema,
  when: z.string(),
  steps: z.array(z.string()),
});

export const undoLastAiChangeToolInputSchema = z.object({});

const changedRowSchema = z.object({ collectionId: z.string(), key: z.string() });

export const undoLastAiChangeToolOutputSchema = z.object({
  undoneTool: z.string().nullable().describe("The tool call that was reverted; null when none."),
  reverted: z.number().int(),
  skipped: z
    .array(changedRowSchema)
    .describe("Rows edited again after that call, left as they are."),
  unknown: z.array(changedRowSchema).describe("Rows whose earlier state is no longer recorded."),
  remaining: z.number().int().describe("How many earlier assistant changes can still be undone."),
  activeResumeId: z
    .string()
    .nullable()
    .describe("Null when the undo removed the active résumé; call set_active_resume."),
});

export type ListResumesToolInput = z.input<typeof listResumesToolInputSchema>;
export type GetResumeToolInput = z.input<typeof getResumeToolInputSchema>;
export type GetResumeToolOutput = z.infer<typeof getResumeToolOutputSchema>;
export type ResumeView = z.infer<typeof resumeViewSchema>;
export type ResumeViewSection = z.infer<typeof resumeViewSectionSchema>;
export type SetActiveResumeToolInput = z.input<typeof setActiveResumeToolInputSchema>;
export type UpdateResumeDetailsToolInput = z.input<typeof updateResumeDetailsToolInputSchema>;
export type UpdateResumeDetailsToolOutput = z.infer<typeof updateResumeDetailsToolOutputSchema>;
export type SetSummaryToolInput = z.input<typeof setSummaryToolInputSchema>;
export type SetSummaryToolOutput = z.infer<typeof setSummaryToolOutputSchema>;
export type SetExperienceBulletsToolInput = z.input<typeof setExperienceBulletsToolInputSchema>;
export type SetExperienceBulletsToolOutput = z.infer<typeof setExperienceBulletsToolOutputSchema>;
export type SetSkillsToolInput = z.input<typeof setSkillsToolInputSchema>;
export type SetSkillsToolOutput = z.infer<typeof setSkillsToolOutputSchema>;
export type RemovableSection = z.infer<typeof removableSectionSchema>;
export type RemoveFromResumeToolInput = z.input<typeof removeFromResumeToolInputSchema>;
export type RemoveFromResumeToolOutput = z.infer<typeof removeFromResumeToolOutputSchema>;
export type UpsertExperienceToolInput = z.input<typeof upsertExperienceToolInputSchema>;
export type UpsertExperienceToolOutput = z.infer<typeof upsertExperienceToolOutputSchema>;
export type UpsertProjectToolInput = z.input<typeof upsertProjectToolInputSchema>;
export type UpsertProjectToolOutput = z.infer<typeof upsertProjectToolOutputSchema>;
export type UpsertEducationToolInput = z.input<typeof upsertEducationToolInputSchema>;
export type UpsertEducationToolOutput = z.infer<typeof upsertEducationToolOutputSchema>;
export type UpsertTalkToolInput = z.input<typeof upsertTalkToolInputSchema>;
export type UpsertTalkToolOutput = z.infer<typeof upsertTalkToolOutputSchema>;
export type ReplaceResumeDocumentToolInput = z.input<typeof replaceResumeDocumentToolInputSchema>;
export type SetActiveResumeToolOutput = z.infer<typeof setActiveResumeToolOutputSchema>;
export type ListResumesToolOutput = z.infer<typeof listResumesToolOutputSchema>;
export type WorkbenchTab = z.infer<typeof workbenchTabSchema>;
export type CloneResumeToolInput = z.input<typeof cloneResumeToolInputSchema>;
export type CloneResumeToolOutput = z.infer<typeof cloneResumeToolOutputSchema>;
export type CreateResumeToolInput = z.input<typeof createResumeToolInputSchema>;
export type CreateResumeToolOutput = z.infer<typeof createResumeToolOutputSchema>;
export type OpenResumeToolInput = z.input<typeof openResumeToolInputSchema>;
export type OpenResumeToolOutput = z.infer<typeof openResumeToolOutputSchema>;
export type RankedResume = z.infer<typeof rankedResumeSchema>;
export type RankResumesForJobToolInput = z.input<typeof rankResumesForJobToolInputSchema>;
export type RankResumesForJobToolOutput = z.infer<typeof rankResumesForJobToolOutputSchema>;
export type TailorResumeForJobToolInput = z.input<typeof tailorResumeForJobToolInputSchema>;
export type TailorResumeForJobToolOutput = z.infer<typeof tailorResumeForJobToolOutputSchema>;
export type ReplaceResumeDocumentToolOutput = z.infer<typeof replaceResumeDocumentToolOutputSchema>;
export type JobStatusTool = z.infer<typeof jobStatusToolSchema>;
export type JobRow = z.infer<typeof jobRowSchema>;
export type JobDetail = z.infer<typeof jobDetailSchema>;
export type SaveJobToolInput = z.input<typeof saveJobToolInputSchema>;
export type SaveJobToolOutput = z.infer<typeof saveJobToolOutputSchema>;
export type UpdateJobToolInput = z.input<typeof updateJobToolInputSchema>;
export type UpdateJobToolOutput = z.infer<typeof updateJobToolOutputSchema>;
export type GetJobToolInput = z.input<typeof getJobToolInputSchema>;
export type GetJobToolOutput = z.infer<typeof getJobToolOutputSchema>;
export type ListJobsToolInput = z.input<typeof listJobsToolInputSchema>;
export type ListJobsToolOutput = z.infer<typeof listJobsToolOutputSchema>;
export type AttachJobToolInput = z.input<typeof attachJobToolInputSchema>;
export type AttachJobToolOutput = z.infer<typeof attachJobToolOutputSchema>;
export type LibrarySection = z.infer<typeof librarySectionSchema>;
export type LibraryHit = z.infer<typeof libraryHitSchema>;
export type SearchLibraryToolInput = z.input<typeof searchLibraryToolInputSchema>;
export type SearchLibraryToolOutput = z.infer<typeof searchLibraryToolOutputSchema>;
export type AttachableSection = z.infer<typeof attachableSectionSchema>;
export type AttachLibraryItemsToolInput = z.input<typeof attachLibraryItemsToolInputSchema>;
export type AttachLibraryItemsToolOutput = z.infer<typeof attachLibraryItemsToolOutputSchema>;
export type RankedLibraryItem = z.infer<typeof rankedLibraryItemSchema>;
export type RankLibraryForJobToolInput = z.input<typeof rankLibraryForJobToolInputSchema>;
export type RankLibraryForJobToolOutput = z.infer<typeof rankLibraryForJobToolOutputSchema>;
export type ReorderableSection = z.infer<typeof reorderableSectionSchema>;
export type ReorderSectionToolInput = z.input<typeof reorderSectionToolInputSchema>;
export type ReorderSectionToolOutput = z.infer<typeof reorderSectionToolOutputSchema>;
export type SetContactsToolInput = z.input<typeof setContactsToolInputSchema>;
export type SetContactsToolOutput = z.infer<typeof setContactsToolOutputSchema>;
export type SetLinksToolInput = z.input<typeof setLinksToolInputSchema>;
export type SetLinksToolOutput = z.infer<typeof setLinksToolOutputSchema>;
export type SetNotesToolInput = z.input<typeof setNotesToolInputSchema>;
export type SetNotesToolOutput = z.infer<typeof setNotesToolOutputSchema>;
export type PlaybookName = z.infer<typeof playbookNameSchema>;
export type GetPlaybookToolInput = z.input<typeof getPlaybookToolInputSchema>;
export type GetPlaybookToolOutput = z.infer<typeof getPlaybookToolOutputSchema>;
export type UndoLastAiChangeToolInput = z.input<typeof undoLastAiChangeToolInputSchema>;
export type UndoLastAiChangeToolOutput = z.infer<typeof undoLastAiChangeToolOutputSchema>;
