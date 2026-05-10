import "@tanstack/react-start/server-only";

import {
  addExperienceBulletToolInputSchema,
  addExperienceBulletToolOutputSchema,
  cloneResumeToolInputSchema,
  cloneResumeToolOutputSchema,
  createResumeFromDocumentToolInputSchema,
  createResumeFromDocumentToolOutputSchema,
  getResumeDocumentToolInputSchema,
  getResumeDocumentToolOutputSchema,
  listResumesToolInputSchema,
  listResumesToolOutputSchema,
  replaceExperienceBulletsToolInputSchema,
  replaceExperienceBulletsToolOutputSchema,
  searchResumeBlocksToolInputSchema,
  searchResumeBlocksToolOutputSchema,
  updateResumeDocumentToolInputSchema,
  updateResumeDocumentToolOutputSchema,
} from "./resume-tool-schemas";
import {
  addExperienceBulletTool,
  cloneResumeTool,
  createResumeFromDocumentTool,
  getResumeDocumentTool,
  listResumesTool,
  replaceExperienceBulletsTool,
  searchResumeBlocksTool,
  updateResumeDocumentTool,
} from "./resume-tools.server";
import { resumeReadProcedure, resumeWriteProcedure } from "./resume-orpc-base.server";

// ─── Read procedures ──────────────────────────────────────────────────────────
// Require resumes:read permission. Safe to expose to read-only API keys.

const listResumesProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/resumes/list",
    summary: "List resumes",
    description: "List resumes available to the authenticated agentic API caller.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(listResumesToolInputSchema)
  .output(listResumesToolOutputSchema)
  .handler(async ({ context, input }) => listResumesTool({ userId: context.userId }, input));

const getResumeDocumentProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/resumes/document",
    summary: "Get a resume document",
    description: "Load one resume as a normalized ResumeDocumentV1 payload.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(getResumeDocumentToolInputSchema)
  .output(getResumeDocumentToolOutputSchema)
  .handler(async ({ context, input }) => getResumeDocumentTool({ userId: context.userId }, input));

const searchResumeBlocksProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/resume-blocks/search",
    summary: "Search reusable resume blocks",
    description: "Search summaries, experience bullets, projects, and skills for tailoring.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(searchResumeBlocksToolInputSchema)
  .output(searchResumeBlocksToolOutputSchema)
  .handler(async ({ context, input }) => searchResumeBlocksTool({ userId: context.userId }, input));

// ─── Write procedures ─────────────────────────────────────────────────────────
// Require resumes:write permission. Read-only keys are rejected by the base middleware
// before the handler is ever reached.

const addExperienceBulletProcedure = resumeWriteProcedure
  .route({
    method: "POST",
    path: "/experience-bullets/add",
    summary: "Add an experience bullet",
    description: "Append or insert a tailored bullet under an owned experience entry.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(addExperienceBulletToolInputSchema)
  .output(addExperienceBulletToolOutputSchema)
  .handler(async ({ context, input }) =>
    addExperienceBulletTool({ userId: context.userId }, input),
  );

const replaceExperienceBulletsProcedure = resumeWriteProcedure
  .route({
    method: "POST",
    path: "/experience-bullets/replace",
    summary: "Replace experience bullets",
    description: "Replace the full bullet set for an owned experience entry.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(replaceExperienceBulletsToolInputSchema)
  .output(replaceExperienceBulletsToolOutputSchema)
  .handler(async ({ context, input }) =>
    replaceExperienceBulletsTool({ userId: context.userId }, input),
  );

const createResumeFromDocumentProcedure = resumeWriteProcedure
  .route({
    method: "POST",
    path: "/resumes/create-from-document",
    summary: "Create a resume from a complete document",
    description: "Persist a full ResumeDocumentV1 as a new resume draft for the caller.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(createResumeFromDocumentToolInputSchema)
  .output(createResumeFromDocumentToolOutputSchema)
  .handler(async ({ context, input }) =>
    createResumeFromDocumentTool({ userId: context.userId }, input),
  );

const updateResumeDocumentProcedure = resumeWriteProcedure
  .route({
    method: "POST",
    path: "/resumes/update-document",
    summary: "Update a resume document",
    description:
      "Replace all content of an owned resume from a complete ResumeDocumentV1 document.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(updateResumeDocumentToolInputSchema)
  .output(updateResumeDocumentToolOutputSchema)
  .handler(async ({ context, input }) =>
    updateResumeDocumentTool({ userId: context.userId }, input),
  );

const cloneResumeProcedure = resumeWriteProcedure
  .route({
    method: "POST",
    path: "/resumes/clone",
    summary: "Clone a resume",
    description: "Clone an owned resume into a new draft, optionally overriding metadata.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(cloneResumeToolInputSchema)
  .output(cloneResumeToolOutputSchema)
  .handler(async ({ context, input }) => cloneResumeTool({ userId: context.userId }, input));

// ─── Router ───────────────────────────────────────────────────────────────────
// Grouped by domain so the server client (createRouterClient) surfaces a typed,
// namespaced API: client.resumes.list(), client.experienceBullets.add(), etc.

export const resumeAgenticRouter = {
  resumes: {
    list: listResumesProcedure,
    document: getResumeDocumentProcedure,
    createFromDocument: createResumeFromDocumentProcedure,
    clone: cloneResumeProcedure,
    updateDocument: updateResumeDocumentProcedure,
  },
  resumeBlocks: {
    search: searchResumeBlocksProcedure,
  },
  experienceBullets: {
    add: addExperienceBulletProcedure,
    replace: replaceExperienceBulletsProcedure,
  },
};

export type ResumeAgenticRouter = typeof resumeAgenticRouter;
