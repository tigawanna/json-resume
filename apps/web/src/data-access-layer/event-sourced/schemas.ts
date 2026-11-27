import { z } from "zod";
import { embeddableSchema, timestampsSchema } from "@repo/isomorphic/resume/rows";
import { aiRoutingSchema } from "@repo/isomorphic/agentic/routing";

/**
 * Event-sourced row contracts shared with the API live in
 * `@repo/isomorphic/resume/rows`. This module keeps local-only app and AI
 * settings schemas and re-exports the row contracts for existing web imports.
 */
export * from "@repo/isomorphic/resume/rows";

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
  /** Appends the opt-in writing-style rules to the system prompt. */
  aiSlopGuard: z.boolean().optional(),
  /** OpenRouter provider routing for the selected model. */
  aiRouting: aiRoutingSchema.optional(),
  /** Column visibility + sort per list route (e.g. `resumes`). */
  listTablePrefs: z.record(z.string(), listTablePrefsSchema).optional(),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

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

// --- cover letter (optional companion to a résumé) ---

export const coverLetterSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  title: z.string(),
  /** Markdown; preview, PDF and rich-text copy are all rendered from it. */
  body: z.string(),
  resumeId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type CoverLetter = z.infer<typeof coverLetterSchema>;

// --- application answers (questions asked on job application forms) ---

export const applicationAnswerSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  question: z.string(),
  /** Plain text, pasted as-is into application forms. */
  answer: z.string(),
  resumeId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  sortOrder: z.number(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ApplicationAnswer = z.infer<typeof applicationAnswerSchema>;

// --- assistant skills (instructions the résumé assistants follow) ---

export const assistantSkillScopeSchema = z.enum(["resume", "experience", "dashboard"]);
export type AssistantSkillScope = z.infer<typeof assistantSkillScopeSchema>;

export const assistantSkillSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string(),
  body: z.string(),
  /** Chats that load this skill when it is a default. */
  scopes: z.array(assistantSkillScopeSchema),
  isDefault: z.boolean(),
  /** Stable key for a skill that ships with the app. Null when the user wrote it. */
  builtinKey: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type AssistantSkill = z.infer<typeof assistantSkillSchema>;

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
