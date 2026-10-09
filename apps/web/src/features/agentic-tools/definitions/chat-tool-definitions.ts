import { getPlaybookToolDefinition, undoLastAiChangeToolDefinition } from "./assistant-definitions";
import {
  attachJobToolDefinition,
  getJobToolDefinition,
  listJobsToolDefinition,
  saveJobToolDefinition,
  updateJobToolDefinition,
} from "./job-definitions";
import {
  attachLibraryItemsToolDefinition,
  rankLibraryForJobToolDefinition,
  searchLibraryToolDefinition,
} from "./library-definitions";
import {
  cloneResumeToolDefinition,
  createResumeToolDefinition,
  getResumeToolDefinition,
  listResumesToolDefinition,
  openResumeToolDefinition,
  rankResumesForJobToolDefinition,
  setActiveResumeToolDefinition,
  tailorResumeForJobToolDefinition,
} from "./resume-definitions";
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
} from "./resume-edit-definitions";

/**
 * Every tool the in-app assistant can call. The server sends these to the model;
 * `client-tools.ts` must implement exactly these names. `lazy` ones are only
 * listed by name until the model discovers them.
 */
export const chatToolDefinitions = [
  listResumesToolDefinition,
  getResumeToolDefinition,
  setActiveResumeToolDefinition,
  searchLibraryToolDefinition,
  attachLibraryItemsToolDefinition,
  rankLibraryForJobToolDefinition,
  updateResumeDetailsToolDefinition,
  setSummaryToolDefinition,
  setExperienceBulletsToolDefinition,
  setSkillsToolDefinition,
  upsertExperienceToolDefinition,
  upsertProjectToolDefinition,
  upsertEducationToolDefinition,
  upsertTalkToolDefinition,
  setContactsToolDefinition,
  setLinksToolDefinition,
  setNotesToolDefinition,
  reorderSectionToolDefinition,
  removeFromResumeToolDefinition,
  replaceResumeDocumentToolDefinition,
  cloneResumeToolDefinition,
  createResumeToolDefinition,
  rankResumesForJobToolDefinition,
  tailorResumeForJobToolDefinition,
  openResumeToolDefinition,
  listJobsToolDefinition,
  getJobToolDefinition,
  saveJobToolDefinition,
  updateJobToolDefinition,
  attachJobToolDefinition,
  getPlaybookToolDefinition,
  undoLastAiChangeToolDefinition,
] as const;
