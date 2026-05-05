import "@tanstack/react-start/server-only";

import {
  authenticateApiKeyHeaders,
  type ApiKeyPermissionCheck,
} from "@/lib/better-auth/api-key.server";
import { serverEnv } from "@/lib/server-env";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { ORPCError, createRouterClient, os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { agenticCorsHeaders, agenticOpenApiBasePath, agenticRpcBasePath } from "./agentic-routes";
import {
  addExperienceBulletToolInputSchema,
  addExperienceBulletToolOutputSchema,
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
} from "./resume-tool-schemas";
import {
  addExperienceBulletTool,
  createResumeFromDocumentTool,
  getResumeDocumentTool,
  listResumesTool,
  replaceExperienceBulletsTool,
  searchResumeBlocksTool,
} from "./resume-tools.server";

type AgenticInitialContext = {
  headers?: Headers;
  userId?: string;
};

type AgenticCurrentContext = {
  headers?: Headers;
  userId: string;
};

const agenticBase = os
  .$config({
    initialInputValidationIndex: Number.NEGATIVE_INFINITY,
    initialOutputValidationIndex: Number.NEGATIVE_INFINITY,
  })
  .$context<AgenticInitialContext>();

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(agenticCorsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function agenticOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: agenticCorsHeaders,
  });
}

function createAgenticProcedure(permissions: ApiKeyPermissionCheck) {
  return agenticBase.use(async ({ context, next }) => {
    if (context.userId) {
      return next({
        context: {
          headers: context.headers,
          userId: context.userId,
        } satisfies AgenticCurrentContext,
      });
    }

    const headers = context.headers;
    if (!headers) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const auth = await authenticateApiKeyHeaders(headers, permissions);
    if (!auth) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    return next({
      context: {
        headers,
        userId: auth.userId,
      } satisfies AgenticCurrentContext,
    });
  });
}

const resumeReadProcedure = createAgenticProcedure({ resumes: ["read"] });
const resumeWriteProcedure = createAgenticProcedure({ resumes: ["write"] });

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

export const resumeAgenticRouter = {
  resumes: {
    list: listResumesProcedure,
    document: getResumeDocumentProcedure,
    createFromDocument: createResumeFromDocumentProcedure,
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

const rpcHandler = new RPCHandler(resumeAgenticRouter);

const openApiHandler = new OpenAPIHandler(resumeAgenticRouter);

const openApiGenerator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

export async function handleAgenticRpcRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return agenticOptionsResponse();
  }

  const { response } = await rpcHandler.handle(request, {
    prefix: agenticRpcBasePath,
    context: {
      headers: request.headers,
    } satisfies AgenticInitialContext,
  });

  return withCors(response ?? new Response("Not Found", { status: 404 }));
}

export async function handleAgenticOpenApiRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return agenticOptionsResponse();
  }

  const { matched, response } = await openApiHandler.handle(request, {
    prefix: agenticOpenApiBasePath,
    context: {
      headers: request.headers,
    } satisfies AgenticInitialContext,
  });

  return withCors(response ?? new Response(matched ? null : "Not Found", { status: 404 }));
}

export async function getAgenticOpenApiSpec(): Promise<unknown> {
  return openApiGenerator.generate(resumeAgenticRouter, {
    info: {
      title: "Agentic JSON Resume API",
      version: "0.1.0",
    },
    servers: [{ url: serverEnv.FRONTEND_URL }],
  });
}

export function createResumeAgenticServerClient(userId: string) {
  return createRouterClient(resumeAgenticRouter, {
    context: {
      userId,
    } satisfies AgenticInitialContext,
  });
}
