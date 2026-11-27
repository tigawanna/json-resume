import type { Tool } from "@tanstack/ai";
import type { PageToolPack } from "./definitions/page-tool-pack.ts";

export type { PageToolPack } from "./definitions/page-tool-pack.ts";
import {
  mutateCollectionToolDefinition,
  queryCollectionToolDefinition,
  searchConversationsToolDefinition,
} from "./definitions/assistant-data-definitions.ts";
import { searchApplicationAnswersToolDefinition } from "./definitions/application-answer-definitions.ts";
import {
  getCoverLetterToolDefinition,
  listCoverLettersToolDefinition,
} from "./definitions/cover-letter-definitions.ts";
import { askUserToolDefinition } from "./definitions/assistant-definitions.ts";
import {
  getApplicationStatsToolDefinition,
  getProfileOverviewToolDefinition,
  startFirstResumeToolDefinition,
  startResumeForJobToolDefinition,
} from "./definitions/dashboard-definitions.ts";
import { experienceToolDefinitions } from "./definitions/experience-definitions.ts";
import {
  getJobToolDefinition,
  listJobsToolDefinition,
  quotePayRateToolDefinition,
  saveJobToolDefinition,
} from "./definitions/job-definitions.ts";
import { searchLibraryToolDefinition } from "./definitions/library-definitions.ts";
import {
  getResumeToolDefinition,
  listResumesToolDefinition,
  rankResumesForJobToolDefinition,
} from "./definitions/resume-definitions.ts";

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
