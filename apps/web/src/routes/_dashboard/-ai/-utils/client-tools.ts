import {
  attachJobToCurrentResumeToolDefinition,
  listJobsToolDefinition,
  saveJobToolDefinition,
} from "@/features/agentic-tools/definitions/job-definitions";
import { searchCurrentResumeBlocksToolDefinition } from "@/features/agentic-tools/definitions/library-definitions";
import {
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  getResumeToolDefinition,
  listResumesToolDefinition,
  navigateToResumeToolDefinition,
  setActiveResumeToolDefinition,
  updateCurrentResumeDocumentToolDefinition,
} from "@/features/agentic-tools/definitions/resume-definitions";
import {
  removeFromResumeToolDefinition,
  setExperienceBulletsToolDefinition,
  setSkillsToolDefinition,
  setSummaryToolDefinition,
  updateResumeDetailsToolDefinition,
} from "@/features/agentic-tools/definitions/resume-edit-definitions";
import type {
  LocalToolContext,
  ResumeWorkbenchTab,
} from "@/features/agentic-tools/definitions/tool-context";
import {
  removeLocalFromResume,
  setLocalExperienceBullets,
  setLocalSkills,
  setLocalSummary,
  updateLocalResumeDetails,
} from "./local-resume-edit-tools";
import {
  cloneLocalResume,
  createLocalResumeFromDocument,
  getLocalResume,
  listLocalResumes,
  searchLocalResumeBlocks,
  setLocalActiveResume,
  updateLocalResumeDocument,
} from "./local-resume-tools";
import { attachLocalJobToCurrentResume, listLocalJobs, saveLocalJob } from "./local-job-tools";

type ClientToolCtx = { context: LocalToolContext };

function asWorkbenchTab(tab: string): ResumeWorkbenchTab {
  if (tab === "preview" || tab === "json") return tab;
  return "edit";
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

export const searchCurrentResumeBlocksClientTool = searchCurrentResumeBlocksToolDefinition.client(
  (input, ctx: ClientToolCtx) =>
    searchLocalResumeBlocks(ctx.context, {
      keyword: input.keyword || undefined,
      blockTypes: input.blockTypes,
      limitPerType: input.limitPerType,
    }),
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

export const removeFromResumeClientTool = removeFromResumeToolDefinition.client(
  (input, ctx: ClientToolCtx) => removeLocalFromResume(ctx.context, input),
);

export const cloneCurrentResumeClientTool = cloneCurrentResumeToolDefinition.client(
  (input, ctx: ClientToolCtx) => cloneLocalResume(ctx.context, input),
);

export const createResumeFromDocumentClientTool = createResumeFromDocumentToolDefinition.client(
  (input, ctx: ClientToolCtx) => createLocalResumeFromDocument(ctx.context, input),
);

export const updateCurrentResumeDocumentClientTool =
  updateCurrentResumeDocumentToolDefinition.client((input, ctx: ClientToolCtx) =>
    updateLocalResumeDocument(ctx.context, input.document),
  );

export const navigateToResumeClientTool = navigateToResumeToolDefinition.client(
  (input, ctx: ClientToolCtx) => {
    const tab = input.tab ?? "preview";
    ctx.context.navigateToResume(input.resumeId, asWorkbenchTab(tab));
    return {
      navigated: true,
      resumeId: input.resumeId,
      tab,
    };
  },
);

export const saveJobClientTool = saveJobToolDefinition.client((input, ctx: ClientToolCtx) =>
  saveLocalJob(ctx.context, {
    description: input.description,
    company: input.company,
    title: input.title,
    url: input.url,
    location: input.location,
    status: input.status,
    notes: input.notes,
    attachToCurrentResume: input.attachToCurrentResume,
  }),
);

export const listJobsClientTool = listJobsToolDefinition.client((input, ctx: ClientToolCtx) =>
  listLocalJobs(ctx.context, {
    keyword: input.keyword,
    status: input.status,
    limit: input.limit,
  }),
);

export const attachJobToCurrentResumeClientTool = attachJobToCurrentResumeToolDefinition.client(
  (input, ctx: ClientToolCtx) => attachLocalJobToCurrentResume(ctx.context, input.jobId),
);

export const eventSourcedResumeAiClientTools = [
  listResumesClientTool,
  getResumeClientTool,
  setActiveResumeClientTool,
  searchCurrentResumeBlocksClientTool,
  updateResumeDetailsClientTool,
  setSummaryClientTool,
  setExperienceBulletsClientTool,
  setSkillsClientTool,
  removeFromResumeClientTool,
  cloneCurrentResumeClientTool,
  createResumeFromDocumentClientTool,
  updateCurrentResumeDocumentClientTool,
  navigateToResumeClientTool,
  saveJobClientTool,
  listJobsClientTool,
  attachJobToCurrentResumeClientTool,
];
