# Playwright E2E TODO and Handoff

Last updated: 2026-05-20

## How To Use This File

- Read this file before starting e2e work.
- Pick the first unchecked route/spec unless the user asks for a different one.
- When starting a file, change its status to `in progress` and add a short note under `Current Handoff`.
- When finishing a file, mark it done, add the exact command you ran, and update `Next Pickup`.
- Keep one spec file per route or major workflow so tests can be run in small parts.
- Keep shared helpers boring: auth, navigation, unique fixture data, toast/assertion helpers. Do not hide route-specific form fields inside a giant all-routes helper.

## Current Handoff

Completed in this pass: `resume-data-experiences.spec.ts`.
Completed in this pass: `resume-data-education.spec.ts`.

Created files in this pass:

- `support/resume-data-navigation.ts`
- `resume-data-experiences.spec.ts`
- `resume-data-education.spec.ts`

Verification run in this pass:

- `pnpm --dir apps/web exec playwright test e2e/resume-data-experiences.spec.ts`
- `pnpm --dir apps/web check-types`
- `pnpm --dir apps/web exec playwright test e2e/resume-data-education.spec.ts`

We have baseline resume workflow coverage and an editor-embedded resume parts CRUD flow. The next recommended step is to add standalone **Resume Data** route specs, one file per sidebar route. These should test the list/library pages themselves, not the resume editor accordion.

Preferred flow for each standalone route:

1. Sign up.
2. Navigate directly to the route.
3. Assert the route page is visible.
4. Create an item.
5. Assert the item appears.
6. Reload and assert it persisted.
7. Edit the item.
8. Assert the updated item appears.
9. Delete the item.
10. Reload and assert it remains deleted.

## Existing Spec Files

- [x] `resume-create.spec.ts`
  - Covers creating a resume through authenticated UI.
  - Verified with `pnpm --dir apps/web test:e2e` on 2026-05-19.

- [x] `resume-editor.spec.ts`
  - Covers full editor persistence into JSON output.
  - Verified with `pnpm --dir apps/web test:e2e` on 2026-05-19.

- [x] `resume-reuse.spec.ts`
  - Covers creating a second default resume and reusing reusable parts instead of duplicating them.
  - Verified with `pnpm --dir apps/web test:e2e` on 2026-05-19.

- [x] `resume-parts-crud.spec.ts`
  - Covers adding, editing, and removing resume parts inside the resume editor.
  - Reuses `support/resume-part-actions.ts`.
  - Next improvement: keep this as editor-specific coverage; do not add standalone route CRUD here.

## Support Files

- [x] `support/auth.ts`
  - Shared sign-up helper.

- [x] `support/database.ts`
  - Shared DB read helpers for e2e assertions.

- [x] `support/resume-workflow.ts`
  - Shared navigation and resume creation helpers.

- [x] `support/resume-editor-sections.ts`
  - Shared helpers for opening editor accordion sections and asserting field values.

- [x] `support/resume-part-actions.ts`
  - Editor-specific resume part actions.
  - Do not grow this into standalone route CRUD.

- [x] `support/resume-data-navigation.ts`
  - Add when starting standalone Resume Data route specs.
  - Should provide route navigation helpers only.

- [ ] `support/resume-data-fixtures.ts`
  - Add unique fixtures for standalone route CRUD.
  - Should export data factories, not Playwright actions.

- [ ] `support/resume-data-assertions.ts`
  - Add common toast and visibility assertions if duplication appears.
  - Keep route-specific locators in route spec files unless the pattern is truly identical.

## Planned Resume Data Route Specs

- [x] `resume-data-experiences.spec.ts`
  - Route: `/experiences`
  - Priority: high.
  - Cover create, reload persistence, edit, delete.
  - Verified with `pnpm --dir apps/web exec playwright test e2e/resume-data-experiences.spec.ts` on 2026-05-20.

- [x] `resume-data-education.spec.ts`
  - Route: `/education`
  - Priority: high.
  - Cover create, reload persistence, edit, delete.
  - Verified with `pnpm --dir apps/web exec playwright test e2e/resume-data-education.spec.ts` on 2026-05-20.

- [ ] `resume-data-projects.spec.ts`
  - Route: `/resume-projects`
  - Priority: high.
  - Use this for resume project CRUD, not `/projects` repository search.

- [ ] `resume-data-skill-groups.spec.ts`
  - Route: `/skill-groups`
  - Priority: high.
  - Cover group creation with at least one skill item if the route exposes it.

- [ ] `resume-data-summaries.spec.ts`
  - Route: `/summaries`
  - Priority: medium.
  - Cover create, reload persistence, edit, delete.

- [ ] `resume-data-contacts.spec.ts`
  - Route: `/contacts`
  - Priority: medium.
  - Cover create, reload persistence, edit, delete.

- [ ] `resume-data-links.spec.ts`
  - Route: `/links`
  - Priority: medium.
  - Cover create, reload persistence, edit, delete.

- [ ] `resume-data-talks.spec.ts`
  - Route: `/talks`
  - Priority: medium.
  - Cover create, reload persistence, edit, delete.

- [ ] `resume-data-certifications.spec.ts`
  - Route: `/certifications`
  - Priority: medium.
  - Cover create, reload persistence, edit, delete.

- [ ] `resume-data-volunteers.spec.ts`
  - Route: `/volunteers`
  - Priority: medium.
  - Cover create, reload persistence, edit, delete.

- [ ] `resume-data-languages.spec.ts`
  - Route: `/languages`
  - Priority: medium.
  - Cover create, reload persistence, edit, delete.

## Non Resume Data Route Specs To Consider Later

- [ ] `resumes-list.spec.ts`
  - Route: `/resumes`
  - Cover list, open, clone, copy JSON if clipboard permissions are stable, and delete.

- [ ] `settings-api-keys.spec.ts`
  - Route: `/settings`
  - Cover create API key, reveal/copy state, delete.

- [ ] `repos.spec.ts`
  - Route: `/repos`
  - Needs API mocking for GitHub responses.
  - Keep mocks local to this spec or a repos-specific support file.

- [ ] `saved-projects.spec.ts`
  - Route: `/saved-projects`
  - Best added after `repos.spec.ts` or after adding direct fixture seeding.

## Next Pickup

Start `resume-data-projects.spec.ts`.

Suggested first edit:

1. Reuse `support/resume-data-navigation.ts` to open `/resume-projects` and assert `resume-project-list-page`.
2. Add `resume-data-projects.spec.ts` with one CRUD test.
3. Update this file immediately after the spec file is created, then again after it passes.

Suggested verification:

```bash
pnpm --dir apps/web exec playwright test e2e/resume-data-projects.spec.ts
pnpm --dir apps/web check-types
```
