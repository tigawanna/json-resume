import {
  attachJobToCurrentResumeToolDefinition,
  listJobsToolDefinition,
  saveJobToolDefinition,
} from "./job-definitions";
import { searchCurrentResumeBlocksToolDefinition } from "./library-definitions";
import {
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  getResumeToolDefinition,
  listResumesToolDefinition,
  navigateToResumeToolDefinition,
  setActiveResumeToolDefinition,
  updateCurrentResumeDocumentToolDefinition,
} from "./resume-definitions";
import {
  removeFromResumeToolDefinition,
  setExperienceBulletsToolDefinition,
  setSkillsToolDefinition,
  setSummaryToolDefinition,
  updateResumeDetailsToolDefinition,
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
  removeFromResumeToolDefinition,
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  updateCurrentResumeDocumentToolDefinition,
  navigateToResumeToolDefinition,
  saveJobToolDefinition,
  listJobsToolDefinition,
  attachJobToCurrentResumeToolDefinition,
] as const;
