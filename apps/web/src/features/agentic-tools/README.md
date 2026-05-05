# Agentic Resume Tooling Handoff

This folder is the shared server-only tool layer for agentic resume workflows.

The current implementation exposes these Drizzle-backed tools through MCP:

- `list_resumes`
- `get_resume_document`
- `search_resume_blocks`
- `add_experience_bullet`
- `replace_experience_bullets`
- `create_resume_from_document`

Do not duplicate the query or mutation logic for future API or TanStack AI work. Add thin adapters that validate input, authenticate the caller, and call the functions in `resume-tools.server.ts`.

## Existing Files

- `resume-tool-schemas.ts`
  Shared Zod schemas and TypeScript input types. Use these schemas for MCP, raw API routes, and TanStack AI tool wrappers.

- `resume-tools.server.ts`
  Server-only implementations. These functions take `{ userId }` plus a validated input object, enforce ownership where needed, and query/mutate Drizzle.

- `resume-mcp.server.ts`
  MCP-specific adapter. It registers the shared functions as MCP tools and returns `structuredContent`.

- `src/routes/api/mcp.ts`
  Streamable HTTP MCP endpoint protected by Better Auth MCP OAuth via `withMcpAuth`.

- `src/lib/better-auth/api-key.server.ts`
  Helper for future raw API routes. It accepts `x-api-key` or `Authorization: Bearer ...`, verifies via Better Auth API key plugin, and returns the user id.

## Raw API Layer Plan

Create routes under:

```txt
apps/web/src/routes/api/agentic/
```

Recommended first route:

```txt
apps/web/src/routes/api/agentic/resume-tools/$tool.ts
```

or explicit routes if you prefer clearer contracts:

```txt
apps/web/src/routes/api/agentic/resumes/list.ts
apps/web/src/routes/api/agentic/resumes/document.ts
apps/web/src/routes/api/agentic/resume-blocks/search.ts
apps/web/src/routes/api/agentic/experience-bullets/add.ts
apps/web/src/routes/api/agentic/experience-bullets/replace.ts
apps/web/src/routes/api/agentic/resumes/create-from-document.ts
```

Each route should:

1. Import `authenticateApiKeyRequest` from `@/lib/better-auth/api-key.server`.
2. Authenticate the request with a permission check.
3. Parse JSON body as `unknown`.
4. Validate with the matching schema from `resume-tool-schemas.ts`.
5. Call the matching function from `resume-tools.server.ts`.
6. Return `Response.json(result)`.
7. Catch errors as `unknown`, unwrap only with safe helpers or `instanceof Error`.

Suggested permission shape:

```ts
const resumeReadPermission = { resumes: ["read"] };
const resumeWritePermission = { resumes: ["write"] };
```

Use read permission for:

- list resumes
- get resume document
- search resume blocks

Use write permission for:

- add experience bullet
- replace experience bullets
- create resume from document

Do not enable Better Auth `enableSessionForAPIKeys` unless deliberately changing the auth model. The helper already verifies API keys directly and avoids pretending API keys are cookie sessions.

Example route shape:

```ts
import { searchResumeBlocksTool } from "@/features/agentic-tools/resume-tools.server";
import { searchResumeBlocksToolInputSchema } from "@/features/agentic-tools/resume-tool-schemas";
import { authenticateApiKeyRequest } from "@/lib/better-auth/api-key.server";
import { createFileRoute } from "@tanstack/react-router";

async function post(request: Request): Promise<Response> {
  const auth = await authenticateApiKeyRequest(request, { resumes: ["read"] });
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw: unknown = await request.json();
    const input = searchResumeBlocksToolInputSchema.parse(raw);
    return Response.json(await searchResumeBlocksTool({ userId: auth.userId }, input));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

export const Route = createFileRoute("/api/agentic/resume-blocks/search")({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => post(request),
    },
  },
});
```

## TanStack AI / OpenRouter Layer Plan

Do this after the API routes, or in parallel if the API route contracts are stable.

Create a server-only module such as:

```txt
apps/web/src/features/agentic-tools/resume-agent.server.ts
```

The agent module should not import MCP code. It should wrap `resume-tools.server.ts` directly.

Inputs for the first agent workflow:

```ts
type TailorResumeInput = {
  jobDescription: string;
  baseResumeId?: string;
  pastedResumeText?: string;
  extraInstructions?: string;
};
```

Expected workflow:

1. If `baseResumeId` exists, call `getResumeDocumentTool`.
2. Search relevant blocks with `searchResumeBlocksTool`, using keywords extracted from the job description.
3. Let the model choose the most relevant summaries, bullets, skills, and projects.
4. Ask the model to produce a complete `ResumeDocumentV1`.
5. Validate the model output with `resumeDocumentV1Schema`.
6. Either return the document for preview or call `createResumeFromDocumentTool` to persist it.

Keep model/provider configuration isolated. A good future file split:

```txt
apps/web/src/features/agentic-tools/openrouter.server.ts
apps/web/src/features/agentic-tools/resume-agent.server.ts
apps/web/src/features/agentic-tools/resume-agent-schemas.ts
```

OpenRouter should read keys from server env only. Do not put the OpenRouter key in client env. Add env validation in `src/lib/server-env.ts` when implementation starts.

The TanStack AI UI/chat can later call a server function or route that invokes `resume-agent.server.ts`. Keep that UI route thin; all agent orchestration should live in the server-only feature module.

## Important Constraints

- Keep `resume-tools.server.ts` server-only.
- Do not import `resume-tools.server.ts` into client components.
- Do not add `useMemo` or `useCallback`; this repo uses React Compiler.
- Do not cast to `any`. If a third-party SDK forces awkward types, solve with concrete types or ask before using `any`.
- Catch errors as `unknown`.
- Do not manually edit Better Auth generated schema.
- Do not manually edit SQL migrations unless explicitly requested.
- Use Drizzle schema and commands for database changes.
- Prefer efficient selected-column Drizzle queries for tool search.
- Keep tool outputs structured and stable; agents depend on field names.

## Future Tool Ideas

Add these only when the first API and agent loop are working:

- `update_summary`
- `add_project`
- `replace_project`
- `upsert_skill_group`
- `rank_resume_blocks_for_job`
- `create_tailored_resume_draft`
- `diff_resume_documents`

For ranking or tailoring tools, keep model calls outside `resume-tools.server.ts` unless the tool is explicitly AI-powered. The current file should stay mostly deterministic database logic.
