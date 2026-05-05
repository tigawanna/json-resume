import "@tanstack/react-start/server-only";

import {
  authenticateApiKeyHeaders,
  type ApiKeyPermissionCheck,
} from "@/lib/better-auth/api-key.server";
import { ORPCError, os } from "@orpc/server";

// Before auth runs, callers may provide either raw HTTP headers (external API key path)
// or a pre-resolved userId (internal server-client path). Both fields are optional so
// the same context type works for both entry points without branching at the router level.
export type AgenticInitialContext = {
  headers?: Headers;
  userId?: string;
};

// After the auth middleware resolves, userId is guaranteed to be present.
// All procedure handlers receive this narrowed context.
export type AgenticCurrentContext = {
  headers?: Headers;
  userId: string;
};

// Validation indices are pushed to ±Infinity so oRPC skips its default boundary checks.
// Input/output validation is still applied by the .input()/.output() calls on each procedure;
// this just prevents double-validation from the base builder.
export const agenticBase = os
  .$config({
    initialInputValidationIndex: Number.NEGATIVE_INFINITY,
    initialOutputValidationIndex: Number.NEGATIVE_INFINITY,
  })
  .$context<AgenticInitialContext>();

// Shared auth middleware factory. Each procedure declares the minimum permission scope it needs,
// keeping the authorization contract explicit at the call site rather than buried in middleware.
function createAgenticProcedure(permissions: ApiKeyPermissionCheck) {
  return agenticBase.use(async ({ context, next }) => {
    // Internal server-client callers (e.g. MCP server, AI agent) inject userId directly,
    // bypassing API key verification entirely. This avoids a redundant network round-trip
    // to Better Auth when the caller is already trusted server-side code.
    if (context.userId) {
      return next({
        context: {
          headers: context.headers,
          userId: context.userId,
        } satisfies AgenticCurrentContext,
      });
    }

    // External callers must supply an x-api-key or Authorization: Bearer header.
    const { headers } = context;
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

// Separate read/write procedures enforce the least-privilege principle: a read-only
// API key cannot reach any mutation endpoint, even if the key holder guesses the path.
export const resumeReadProcedure = createAgenticProcedure({ resumes: ["read"] });
export const resumeWriteProcedure = createAgenticProcedure({ resumes: ["write"] });
