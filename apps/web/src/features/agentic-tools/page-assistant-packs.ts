import type { Tool } from "@tanstack/ai";
import type { PageToolPack } from "./definitions/tool-context";
import {
  mutateCollectionToolDefinition,
  queryCollectionToolDefinition,
  searchConversationsToolDefinition,
} from "./definitions/assistant-data-definitions";
import { searchApplicationAnswersToolDefinition } from "./definitions/application-answer-definitions";
import {
  getCoverLetterToolDefinition,
  listCoverLettersToolDefinition,
} from "./definitions/cover-letter-definitions";
import { askUserToolDefinition } from "./definitions/assistant-definitions";
import {
  getApplicationStatsToolDefinition,
  getProfileOverviewToolDefinition,
  startFirstResumeToolDefinition,
  startResumeForJobToolDefinition,
} from "./definitions/dashboard-definitions";
import { experienceToolDefinitions } from "./definitions/experience-definitions";
import {
  getJobToolDefinition,
  listJobsToolDefinition,
  quotePayRateToolDefinition,
  saveJobToolDefinition,
} from "./definitions/job-definitions";
import { searchLibraryToolDefinition } from "./definitions/library-definitions";
import {
  getResumeToolDefinition,
  listResumesToolDefinition,
  rankResumesForJobToolDefinition,
} from "./definitions/resume-definitions";

const libraryPack = [
  queryCollectionToolDefinition,
  mutateCollectionToolDefinition,
  searchConversationsToolDefinition,
] as const;

const jobPack = [
  ...libraryPack,
  saveJobToolDefinition,
  listJobsToolDefinition,
  getJobToolDefinition,
  listResumesToolDefinition,
  getResumeToolDefinition,
  rankResumesForJobToolDefinition,
  quotePayRateToolDefinition,
  startResumeForJobToolDefinition,
  startFirstResumeToolDefinition,
  askUserToolDefinition,
  getApplicationStatsToolDefinition,
] as const;

const resumeListPack = [
  ...jobPack,
  searchLibraryToolDefinition,
  getProfileOverviewToolDefinition,
  searchApplicationAnswersToolDefinition,
  listCoverLettersToolDefinition,
  getCoverLetterToolDefinition,
] as const;

const experiencePack = [...libraryPack, ...experienceToolDefinitions] as const;

const coverLetterPack = [
  ...libraryPack,
  getCoverLetterToolDefinition,
  getJobToolDefinition,
] as const;

const nonePack = [searchConversationsToolDefinition] as const;

/** Every definition the bubble can run. The server sends only the active pack. */
export const pageAssistantToolDefinitions = [
  ...resumeListPack,
  ...experienceToolDefinitions,
] as const;

export function toolsForPack(pack: PageToolPack): ReadonlyArray<Tool> {
  switch (pack) {
    case "experience":
      return experiencePack;
    case "job":
      return jobPack;
    case "resume-list":
      return resumeListPack;
    case "cover-letter":
      return coverLetterPack;
    case "none":
      return nonePack;
    case "library":
      return libraryPack;
  }
}
