import {
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  getCurrentResumeDocumentToolDefinition,
  navigateToResumeToolDefinition,
  refreshResumePreviewToolDefinition,
  searchCurrentResumeBlocksToolDefinition,
  updateCurrentResumeDocumentToolDefinition,
  saveJobToolDefinition,
  listJobsToolDefinition,
  attachJobToCurrentResumeToolDefinition,
} from "@/features/agentic-tools/resume-chat-tool-definitions";
import { listResumesToolDefinition } from "@/features/agentic-tools/definitions/resume-definitions";
import {
  cloneLocalResume,
  createLocalResumeFromDocument,
  getLocalResumeDocument,
  listLocalResumes,
  searchLocalResumeBlocks,
  updateLocalResumeDocument,
  type EventSourcedResumeAiContext,
} from "./local-resume-tools";
import { attachLocalJobToCurrentResume, listLocalJobs, saveLocalJob } from "./local-job-tools";

type ClientToolCtx = { context: EventSourcedResumeAiContext };

function asWorkbenchTab(tab: string): "edit" | "preview" | "json" {
  if (tab === "preview" || tab === "json") return tab;
  return "edit";
}

export const listResumesClientTool = listResumesToolDefinition.client((input, ctx: ClientToolCtx) =>
  listLocalResumes(ctx.context, input),
);

export const getCurrentResumeDocumentClientTool = getCurrentResumeDocumentToolDefinition.client(
  (_input, ctx: ClientToolCtx) => getLocalResumeDocument(ctx.context),
);

export const searchCurrentResumeBlocksClientTool = searchCurrentResumeBlocksToolDefinition.client(
  (input, ctx: ClientToolCtx) =>
    searchLocalResumeBlocks(ctx.context, {
      keyword: input.keyword,
      blockTypes: input.blockTypes,
      limitPerType: typeof input.limitPerType === "number" ? input.limitPerType : undefined,
    }),
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

export const refreshResumePreviewClientTool = refreshResumePreviewToolDefinition.client(
  (_input, ctx: ClientToolCtx) => ({
    refreshed: true,
    resumeId: ctx.context.resumeId,
  }),
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
    limit: typeof input.limit === "number" ? input.limit : undefined,
  }),
);

export const attachJobToCurrentResumeClientTool = attachJobToCurrentResumeToolDefinition.client(
  (input, ctx: ClientToolCtx) => attachLocalJobToCurrentResume(ctx.context, input.jobId),
);

export const eventSourcedResumeAiClientTools = [
  listResumesClientTool,
  getCurrentResumeDocumentClientTool,
  searchCurrentResumeBlocksClientTool,
  cloneCurrentResumeClientTool,
  createResumeFromDocumentClientTool,
  updateCurrentResumeDocumentClientTool,
  refreshResumePreviewClientTool,
  navigateToResumeClientTool,
  saveJobClientTool,
  listJobsClientTool,
  attachJobToCurrentResumeClientTool,
];
