import {
  attachJobToolDefinition,
  getJobToolDefinition,
  listJobsToolDefinition,
  saveJobToolDefinition,
  updateJobToolDefinition,
} from "@/features/agentic-tools/definitions/job-definitions";
import {
  attachLibraryItemsToolDefinition,
  rankLibraryForJobToolDefinition,
  searchLibraryToolDefinition,
} from "@/features/agentic-tools/definitions/library-definitions";
import {
  cloneResumeToolDefinition,
  createResumeToolDefinition,
  getResumeToolDefinition,
  listResumesToolDefinition,
  openResumeToolDefinition,
  rankResumesForJobToolDefinition,
  setActiveResumeToolDefinition,
  tailorResumeForJobToolDefinition,
} from "@/features/agentic-tools/definitions/resume-definitions";
import {
  removeFromResumeToolDefinition,
  reorderSectionToolDefinition,
  replaceResumeDocumentToolDefinition,
  setContactsToolDefinition,
  setExperienceBulletsToolDefinition,
  setLinksToolDefinition,
  setNotesToolDefinition,
  setSkillsToolDefinition,
  setSummaryToolDefinition,
  updateResumeDetailsToolDefinition,
  upsertEducationToolDefinition,
  upsertExperienceToolDefinition,
  upsertProjectToolDefinition,
  upsertTalkToolDefinition,
} from "@/features/agentic-tools/definitions/resume-edit-definitions";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  removeLocalFromResume,
  reorderLocalSection,
  replaceLocalResumeDocument,
  setLocalContacts,
  setLocalExperienceBullets,
  setLocalLinks,
  setLocalNotes,
  setLocalSkills,
  setLocalSummary,
  updateLocalResumeDetails,
  upsertLocalEducation,
  upsertLocalExperience,
  upsertLocalProject,
  upsertLocalTalk,
} from "./local-resume-edit-tools";
import {
  cloneLocalResume,
  createLocalResume,
  openLocalResume,
  rankLocalResumesForJob,
  tailorLocalResumeForJob,
} from "./local-resume-lifecycle-tools";
import {
  attachLocalLibraryItems,
  rankLocalLibraryForJob,
  searchLocalLibrary,
} from "./local-library-tools";
import { getLocalResume, listLocalResumes, setLocalActiveResume } from "./local-resume-tools";
import {
  attachLocalJob,
  getLocalJob,
  listLocalJobs,
  saveLocalJob,
  updateLocalJob,
} from "./local-job-tools";

type ClientToolCtx = { context: LocalToolContext };

export const listResumesClientTool = listResumesToolDefinition.client((input, ctx: ClientToolCtx) =>
  listLocalResumes(ctx.context, input),
);

export const getResumeClientTool = getResumeToolDefinition.client((input, ctx: ClientToolCtx) =>
  getLocalResume(ctx.context, input),
);

export const setActiveResumeClientTool = setActiveResumeToolDefinition.client(
  (input, ctx: ClientToolCtx) => setLocalActiveResume(ctx.context, input),
);

export const searchLibraryClientTool = searchLibraryToolDefinition.client(
  (input, ctx: ClientToolCtx) => searchLocalLibrary(ctx.context, input),
);

export const attachLibraryItemsClientTool = attachLibraryItemsToolDefinition.client(
  (input, ctx: ClientToolCtx) => attachLocalLibraryItems(ctx.context, input),
);

export const rankLibraryForJobClientTool = rankLibraryForJobToolDefinition.client(
  (input, ctx: ClientToolCtx) => rankLocalLibraryForJob(ctx.context, input),
);

export const updateResumeDetailsClientTool = updateResumeDetailsToolDefinition.client(
  (input, ctx: ClientToolCtx) => updateLocalResumeDetails(ctx.context, input),
);

export const setSummaryClientTool = setSummaryToolDefinition.client((input, ctx: ClientToolCtx) =>
  setLocalSummary(ctx.context, input),
);

export const setExperienceBulletsClientTool = setExperienceBulletsToolDefinition.client(
  (input, ctx: ClientToolCtx) => setLocalExperienceBullets(ctx.context, input),
);

export const setSkillsClientTool = setSkillsToolDefinition.client((input, ctx: ClientToolCtx) =>
  setLocalSkills(ctx.context, input),
);

export const upsertExperienceClientTool = upsertExperienceToolDefinition.client(
  (input, ctx: ClientToolCtx) => upsertLocalExperience(ctx.context, input),
);

export const upsertProjectClientTool = upsertProjectToolDefinition.client(
  (input, ctx: ClientToolCtx) => upsertLocalProject(ctx.context, input),
);

export const upsertEducationClientTool = upsertEducationToolDefinition.client(
  (input, ctx: ClientToolCtx) => upsertLocalEducation(ctx.context, input),
);

export const upsertTalkClientTool = upsertTalkToolDefinition.client((input, ctx: ClientToolCtx) =>
  upsertLocalTalk(ctx.context, input),
);

export const setContactsClientTool = setContactsToolDefinition.client((input, ctx: ClientToolCtx) =>
  setLocalContacts(ctx.context, input),
);

export const setLinksClientTool = setLinksToolDefinition.client((input, ctx: ClientToolCtx) =>
  setLocalLinks(ctx.context, input),
);

export const setNotesClientTool = setNotesToolDefinition.client((input, ctx: ClientToolCtx) =>
  setLocalNotes(ctx.context, input),
);

export const reorderSectionClientTool = reorderSectionToolDefinition.client(
  (input, ctx: ClientToolCtx) => reorderLocalSection(ctx.context, input),
);

export const removeFromResumeClientTool = removeFromResumeToolDefinition.client(
  (input, ctx: ClientToolCtx) => removeLocalFromResume(ctx.context, input),
);

export const replaceResumeDocumentClientTool = replaceResumeDocumentToolDefinition.client(
  (input, ctx: ClientToolCtx) => replaceLocalResumeDocument(ctx.context, input),
);

export const cloneResumeClientTool = cloneResumeToolDefinition.client((input, ctx: ClientToolCtx) =>
  cloneLocalResume(ctx.context, input),
);

export const createResumeClientTool = createResumeToolDefinition.client(
  (input, ctx: ClientToolCtx) => createLocalResume(ctx.context, input),
);

export const rankResumesForJobClientTool = rankResumesForJobToolDefinition.client(
  (input, ctx: ClientToolCtx) => rankLocalResumesForJob(ctx.context, input),
);

export const tailorResumeForJobClientTool = tailorResumeForJobToolDefinition.client(
  (input, ctx: ClientToolCtx) => tailorLocalResumeForJob(ctx.context, input),
);

export const openResumeClientTool = openResumeToolDefinition.client((input, ctx: ClientToolCtx) =>
  openLocalResume(ctx.context, input),
);

export const listJobsClientTool = listJobsToolDefinition.client((input, ctx: ClientToolCtx) =>
  listLocalJobs(ctx.context, input),
);

export const getJobClientTool = getJobToolDefinition.client((input, ctx: ClientToolCtx) =>
  getLocalJob(ctx.context, input),
);

export const saveJobClientTool = saveJobToolDefinition.client((input, ctx: ClientToolCtx) =>
  saveLocalJob(ctx.context, input),
);

export const updateJobClientTool = updateJobToolDefinition.client((input, ctx: ClientToolCtx) =>
  updateLocalJob(ctx.context, input),
);

export const attachJobClientTool = attachJobToolDefinition.client((input, ctx: ClientToolCtx) =>
  attachLocalJob(ctx.context, input),
);

export const eventSourcedResumeAiClientTools = [
  listResumesClientTool,
  getResumeClientTool,
  setActiveResumeClientTool,
  searchLibraryClientTool,
  attachLibraryItemsClientTool,
  rankLibraryForJobClientTool,
  updateResumeDetailsClientTool,
  setSummaryClientTool,
  setExperienceBulletsClientTool,
  setSkillsClientTool,
  upsertExperienceClientTool,
  upsertProjectClientTool,
  upsertEducationClientTool,
  upsertTalkClientTool,
  setContactsClientTool,
  setLinksClientTool,
  setNotesClientTool,
  reorderSectionClientTool,
  removeFromResumeClientTool,
  replaceResumeDocumentClientTool,
  cloneResumeClientTool,
  createResumeClientTool,
  rankResumesForJobClientTool,
  tailorResumeForJobClientTool,
  openResumeClientTool,
  listJobsClientTool,
  getJobClientTool,
  saveJobClientTool,
  updateJobClientTool,
  attachJobClientTool,
];
