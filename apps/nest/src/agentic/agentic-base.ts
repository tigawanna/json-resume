import { ORPCError, os } from '@orpc/server';
import type {
  AgenticCurrentContext,
  AgenticInitialContext,
} from './agentic-context.js';
import type { ApiKeyPermissionCheck } from './agentic-auth.service.js';

const agenticBase = os
  .$config({
    initialInputValidationIndex: Number.NEGATIVE_INFINITY,
    initialOutputValidationIndex: Number.NEGATIVE_INFINITY,
  })
  .$context<AgenticInitialContext>();

export function createAgenticProcedure(permissions: ApiKeyPermissionCheck) {
  return agenticBase.use(async ({ context, next }) => {
    const auth = await context.auth.authenticate({
      headers: context.headers,
      permissions,
    });
    if (!auth) throw new ORPCError('UNAUTHORIZED', { message: 'Unauthorized' });
    return next({
      context: {
        headers: context.headers,
        userId: auth.userId,
      } satisfies AgenticCurrentContext,
    });
  });
}

export const resumeReadProcedure = createAgenticProcedure({
  resumes: ['read'],
});
