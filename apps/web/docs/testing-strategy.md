# Testing Strategy

This project should treat data ownership as a first-class security invariant. The most important tests are not broad snapshots; they are small checks that prove one user cannot read, update, replace, or delete another user's resume data.

## Priority Layers

1. **Data access layer security tests**
   - Run against a throwaway SQLite database created from the real Drizzle migrations.
   - Seed at least two users and two resumes.
   - Assert every list/query helper filters by `userId`.
   - Assert ownership guards reject cross-user resume and child-row IDs.
   - Assert elevated roles do not bypass user ownership unless a function is explicitly designed as an admin-only path.

2. **Server function boundary tests**
   - Exercise exported TanStack server functions with a mocked viewer context where practical.
   - For every mutation accepting a raw `resumeId` or child ID, include a cross-owner denial case.
   - Keep success-path tests narrow: one representative create/update/delete per section is enough unless behavior differs.

3. **AI and agentic route tests**
   - Verify cookie-auth AI routes reject unexpected origins and unauthenticated requests.
   - Verify API-key agentic routes do not grant cookie-session permissions.
   - Verify chat tools are read-only unless a save action has a dedicated user-confirmed endpoint.

4. **Dependency and build gates**
   - Run `pnpm check-types`.
   - Run `pnpm --dir apps/web build`.
   - Run `pnpm audit --prod` when the registry is reachable.

## Security Regression Checklist

- A user cannot list another user's resumes by guessing IDs.
- A user cannot mutate another user's child rows by submitting child IDs directly.
- `replaceResumeContent` cannot delete child rows unless the resume belongs to the current user.
- Admin or organization roles do not silently widen personal resume access.
- Browser-held OpenRouter keys are never persisted server-side or exposed in React Query keys.
- MCP endpoint requires write-scoped API keys; read-only keys cannot reach mutation tools.

## Test Naming

Prefer behavior names over implementation names:

- `does not list another user's resume even when the id is supplied`
- `rejects cross-owner child ids`
- `does not let admin role bypass personal resume ownership`

These names make the threat model visible when a test fails.
