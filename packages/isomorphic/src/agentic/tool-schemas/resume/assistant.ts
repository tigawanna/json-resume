import { z } from "zod";

export const playbookNameSchema = z.enum([
  "edit_resume",
  "first_resume",
  "pasted_job",
  "tailored_copy",
  "fill_from_library",
  "import_resume",
  "cover_letter",
  "application_questions",
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

export const wrapUpResumeRoleSchema = z.enum(["created", "edited", "inspiration"]);

export const wrapUpToolInputSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1)
    .max(4000)
    .describe(
      "Markdown, a few lines: what you did and why, and anything the user should check or fill in. Do not list the résumés here; they show as links.",
    ),
  resumes: z
    .array(
      z.object({
        resumeId: z.string().trim().min(1),
        role: wrapUpResumeRoleSchema.describe(
          '"created" for a résumé you made this reply, "edited" for one you changed, "inspiration" for one you took wording or structure from.',
        ),
        note: z
          .string()
          .trim()
          .max(200)
          .optional()
          .describe("What it contributed, in a few words."),
      }),
    )
    .max(12)
    .default([]),
});

export const askUserToolInputSchema = z.object({
  question: z.string().trim().min(1).max(240).describe("One question, in the user's words."),
  options: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        label: z.string().trim().min(1).max(120).describe("Short label shown on the choice."),
      }),
    )
    .min(2)
    .max(8),
  allowMultiple: z
    .boolean()
    .optional()
    .describe("The user may pick more than one choice. Default is one."),
  allowOther: z
    .boolean()
    .optional()
    .describe("Adds an Other choice the user can type. Default is off."),
});

export const askUserToolOutputSchema = z.object({
  selected: z.array(z.object({ id: z.string(), label: z.string() })),
  other: z.string().optional().describe("What the user typed for Other, when they chose it."),
});

export const wrapUpToolOutputSchema = z.object({
  resumes: z.array(
    z.object({
      resumeId: z.string(),
      role: wrapUpResumeRoleSchema,
      name: z.string(),
      note: z.string().optional(),
    }),
  ),
  unknownResumeIds: z
    .array(z.string())
    .describe("Ids that match none of the user's résumés; they were left out."),
});

export type PlaybookName = z.infer<typeof playbookNameSchema>;
export type GetPlaybookToolInput = z.input<typeof getPlaybookToolInputSchema>;
export type GetPlaybookToolOutput = z.infer<typeof getPlaybookToolOutputSchema>;
export type UndoLastAiChangeToolInput = z.input<typeof undoLastAiChangeToolInputSchema>;
export type UndoLastAiChangeToolOutput = z.infer<typeof undoLastAiChangeToolOutputSchema>;
export type WrapUpResumeRole = z.infer<typeof wrapUpResumeRoleSchema>;
export type WrapUpToolInput = z.input<typeof wrapUpToolInputSchema>;
export type WrapUpToolOutput = z.infer<typeof wrapUpToolOutputSchema>;
export type AskUserToolInput = z.input<typeof askUserToolInputSchema>;
export type AskUserToolOutput = z.infer<typeof askUserToolOutputSchema>;
