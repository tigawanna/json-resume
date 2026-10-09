import {
  attachJobToolDefinition,
  getJobToolDefinition,
  listJobsToolDefinition,
  saveJobToolDefinition,
  updateJobToolDefinition,
} from "./job-definitions";
import { searchCurrentResumeBlocksToolDefinition } from "./library-definitions";
import {
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  getResumeToolDefinition,
  listResumesToolDefinition,
  navigateToResumeToolDefinition,
  setActiveResumeToolDefinition,
} from "./resume-definitions";
import {
  removeFromResumeToolDefinition,
  replaceResumeDocumentToolDefinition,
  setExperienceBulletsToolDefinition,
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
 * `client-tools.ts` must implement exactly these names.
 */
export const chatToolDefinitions = [
  listResumesToolDefinition,
  getResumeToolDefinition,
  setActiveResumeToolDefinition,
  searchCurrentResumeBlocksToolDefinition,
  updateResumeDetailsToolDefinition,
  setSummaryToolDefinition,
  setExperienceBulletsToolDefinition,
  setSkillsToolDefinition,
  upsertExperienceToolDefinition,
  upsertProjectToolDefinition,
  upsertEducationToolDefinition,
  upsertTalkToolDefinition,
  removeFromResumeToolDefinition,
  replaceResumeDocumentToolDefinition,
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  navigateToResumeToolDefinition,
  listJobsToolDefinition,
  getJobToolDefinition,
  saveJobToolDefinition,
  updateJobToolDefinition,
  attachJobToolDefinition,
] as const;
