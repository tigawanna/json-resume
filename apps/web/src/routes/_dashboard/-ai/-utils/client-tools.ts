import {
  getPlaybookToolDefinition,
  undoLastAiChangeToolDefinition,
} from "@/features/agentic-tools/definitions/assistant-definitions";
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
import { trackAiChange, undoLocalAiChange } from "./local-undo-tools";
import { getPlaybook } from "@/features/agentic-tools/shared/playbooks";

type ClientToolCtx = { context: LocalToolContext };

/** Write tools record what they changed, so `undo_last_ai_change` can revert it. */
function journaled<TInput, TOutput>(
  tool: string,
  run: (context: LocalToolContext, input: TInput) => TOutput | Promise<TOutput>,
) {
  return (input: TInput, ctx: ClientToolCtx) =>
    trackAiChange(ctx.context, tool, () => run(ctx.context, input));
}

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
  journaled(attachLibraryItemsToolDefinition.name, attachLocalLibraryItems),
);

export const rankLibraryForJobClientTool = rankLibraryForJobToolDefinition.client(
  (input, ctx: ClientToolCtx) => rankLocalLibraryForJob(ctx.context, input),
);

export const updateResumeDetailsClientTool = updateResumeDetailsToolDefinition.client(
  journaled(updateResumeDetailsToolDefinition.name, updateLocalResumeDetails),
);

export const setSummaryClientTool = setSummaryToolDefinition.client(
  journaled(setSummaryToolDefinition.name, setLocalSummary),
);

export const setExperienceBulletsClientTool = setExperienceBulletsToolDefinition.client(
  journaled(setExperienceBulletsToolDefinition.name, setLocalExperienceBullets),
);

export const setSkillsClientTool = setSkillsToolDefinition.client(
  journaled(setSkillsToolDefinition.name, setLocalSkills),
);

export const upsertExperienceClientTool = upsertExperienceToolDefinition.client(
  journaled(upsertExperienceToolDefinition.name, upsertLocalExperience),
);

export const upsertProjectClientTool = upsertProjectToolDefinition.client(
  journaled(upsertProjectToolDefinition.name, upsertLocalProject),
);

export const upsertEducationClientTool = upsertEducationToolDefinition.client(
  journaled(upsertEducationToolDefinition.name, upsertLocalEducation),
);

export const upsertTalkClientTool = upsertTalkToolDefinition.client(
  journaled(upsertTalkToolDefinition.name, upsertLocalTalk),
);

export const setContactsClientTool = setContactsToolDefinition.client(
  journaled(setContactsToolDefinition.name, setLocalContacts),
);

export const setLinksClientTool = setLinksToolDefinition.client(
  journaled(setLinksToolDefinition.name, setLocalLinks),
);

export const setNotesClientTool = setNotesToolDefinition.client(
  journaled(setNotesToolDefinition.name, setLocalNotes),
);

export const reorderSectionClientTool = reorderSectionToolDefinition.client(
  journaled(reorderSectionToolDefinition.name, reorderLocalSection),
);

export const removeFromResumeClientTool = removeFromResumeToolDefinition.client(
  journaled(removeFromResumeToolDefinition.name, removeLocalFromResume),
);

export const replaceResumeDocumentClientTool = replaceResumeDocumentToolDefinition.client(
  journaled(replaceResumeDocumentToolDefinition.name, replaceLocalResumeDocument),
);

export const cloneResumeClientTool = cloneResumeToolDefinition.client(
  journaled(cloneResumeToolDefinition.name, cloneLocalResume),
);

export const createResumeClientTool = createResumeToolDefinition.client(
  journaled(createResumeToolDefinition.name, createLocalResume),
);

export const rankResumesForJobClientTool = rankResumesForJobToolDefinition.client(
  (input, ctx: ClientToolCtx) => rankLocalResumesForJob(ctx.context, input),
);

export const tailorResumeForJobClientTool = tailorResumeForJobToolDefinition.client(
  journaled(tailorResumeForJobToolDefinition.name, tailorLocalResumeForJob),
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

export const saveJobClientTool = saveJobToolDefinition.client(
  journaled(saveJobToolDefinition.name, saveLocalJob),
);

export const updateJobClientTool = updateJobToolDefinition.client(
  journaled(updateJobToolDefinition.name, updateLocalJob),
);

export const attachJobClientTool = attachJobToolDefinition.client(
  journaled(attachJobToolDefinition.name, attachLocalJob),
);

export const getPlaybookClientTool = getPlaybookToolDefinition.client((input) =>
  getPlaybook(input),
);

export const undoLastAiChangeClientTool = undoLastAiChangeToolDefinition.client(
  (input, ctx: ClientToolCtx) => undoLocalAiChange(ctx.context, input),
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
  getPlaybookClientTool,
  undoLastAiChangeClientTool,
];
