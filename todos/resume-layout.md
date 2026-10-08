# Resume layout column

Goal: a résumé's choices (which sections, experiences, bullets, skill groups,
skills, projects… and in what order) live on the résumé row itself, not in one
link row per choice. The event log for the current data drops from ~1,815 to
~540 events, and skill groups stop forking per résumé.

Work happens on the local copy first (`apps/web/.local-db/json-resume-latest.db`,
see `apps/web/.env`); Turso stays untouched until the last phase.

## Decisions

- One `layout` JSON column on `resume`, nested (not `{ position: id }` maps — an
  array index already is the position, and every update event carries the full
  row anyway).
- Order is array position only — no `sortOrder` numbers inside the layout. JSON
  arrays keep their order through zod, `JSON.stringify` and SQLite JSON, and a
  second number would be a second source of truth (the reason
  `itemsInResumeOrder` exists today). Reordering moves an element.
- A résumé picks its own skills inside each group. A skill group becomes a
  reusable name, so groups merge by name (60 → 28).
- Library `sort_order` columns (`resume_skill`, `resume_experience`, …) stay for
  now: they only order the library pages and add no rows.

## Target shape

```ts
type ResumeLayout = {
  sections: { key: string; title: string; enabled: boolean }[]; // key as stored today
  experiences: { id: string; bullets: string[] }[];
  skillGroups: { id: string; skills: string[] }[];
  education: string[];
  projects: string[];
  talks: string[];
  contacts: string[];
  links: string[];
  summaries: string[];
  notes: string[];
  certifications: string[];
  volunteers: string[];
  languages: string[];
};
```

Replaces `resume_section`, every `resume_*_item` table, `resume_skill_group_skill`
and the client-only `experienceOrder` / `educationOrder` / `projectOrder` /
`talkOrder` fields.

## Numbers (local copy, main user, after prune)

| Replaced by `layout`                                        | Rows |
| ----------------------------------------------------------- | ---- |
| `resume_skill_group_skill`                                  | 424  |
| `resume_experience_bullet_item`                             | 404  |
| `resume_skill_group_item`                                   | 106  |
| `resume_section`                                            | 91   |
| `resume_experience_item`                                    | 75   |
| project / link / contact / talk / summary / education items | 147  |
| skill groups merged by name                                 | 32   |

## Trade-offs

- Two devices editing the same résumé at once: last write wins for the whole
  layout (already true today — update events carry the full row).
- No foreign keys inside the JSON. Client deletes strip the id from every
  layout (résumé updates instead of link-row deletes); server-side admin deletes
  don't, so readers skip ids they can't resolve and compaction prunes them.
- One-time device reset after the event log rebuild.

## Phases

Each phase leaves the app working; old link tables were read as a fallback until
phase 6 dropped them (phases 3 and 4 below describe that interim state).

### 1. Layout module (pure, tested)

- [x] `resumeLayoutSchema` (zod, every list defaults to `[]` so older layouts
      parse) + `emptyResumeLayout()` in `features/resume/resume-layout.ts`
- [x] helpers: `layoutIds`, `setEntities`, `addEntity`, `removeEntity`,
      `swapEntities` (today's reorder is a swap of two ids), `setExperienceBullets`,
      `setGroupSkills`, `layoutReferencedIds`, `removeIdEverywhere(layout, id)`,
      `replaceId(layout, from, to)` (merges nested selections when both ids exist)
- [x] `layoutFromDetail(detail)` — reads the layout off `assembleResumeDetail`'s
      output, so legacy fallbacks (all bullets for unlinked experiences, skills by
      `groupId`, `experienceOrder`) resolve exactly as the editor shows them
- [x] unit tests (`resume-layout.test.ts`)

### 2. Schema: add the column (keep old tables)

- [x] drizzle `resume.layout` (`text("layout", { mode: "json" }).$type<ResumeLayout>()`),
      migration `0008_easy_valkyrie.sql` (`ALTER TABLE resume ADD layout text`),
      applied to the local DB:
      `DATABASE_URL=file:./.local-db/json-resume-latest.db DATABASE_AUTH_TOKEN=local-file pnpm db:migrate`
      (the turso dialect rejects an empty token, even for `file:` URLs)
- [x] client `resumeSchema.layout` (`resumeLayoutSchema.nullable().optional()`);
      projection copies it like any column, and rebuild/compaction read it back
      as an object, so no sync code changed

### 3. Read path from layout (fallback to link rows when `layout` is missing)

- [x] `assemble-resume-detail.ts`: `layoutFromLinks(resumeId, snapshots)` derives
      a layout from link rows with the legacy rules (replaces phase 1's
      `layoutFromDetail`); `resumeLayoutOf` = stored layout ?? derived; one
      renderer turns a layout into the detail. `sortOrder` in the detail is now
      the position; section ids are `${resumeId}:${key}`
- [x] `library-resolve.ts` `linkedEntityIds` adds the stored layout's ids;
      `event-history.ts` adds ids from past layouts in the résumé's own events
- [x] `snapshot-resume.ts`, `use-event-sourced-resume-detail.ts`: no change until
      phase 6 drops the link collections
- [x] tests: `assemble-resume-detail.test.ts`; one-off check on the local DB —
      old assembler vs new (links) vs new (stored layout after JSON round trip)
      agree on all 14 résumés (75 experiences, 404 bullets, 106 groups, 733
      skills, 41 projects, 99 sections)

### 4. Write path to layout

- [x] `event-sourced-resume-workspace.ts`: every method edits the layout through
      `editLayout` (`resume-layout-rows.ts`), which starts from the live row's
      layout or `layoutFromLinks`, so the first edit stores the derived layout.
      Link rows are not deleted yet (deleting them could flip other unmigrated
      résumés into "all bullets" mode); phase 6 drops them. A newly added
      experience starts with all its library bullets. `replaceDocument` writes
      the whole layout in one résumé update
- [x] `resume-item-order.ts` trimmed to `itemsInResumeOrder` (read fallback only);
      `experienceOrder` & co. are no longer written
- [x] `clone-resume.ts`: one résumé insert with a copied layout
- [x] library deletes: `deleteWithReferences` strips the entity and its owned rows
      (bullets) from every stored layout (`removeFromLayouts`)
- [x] AI tools and `ResumeCreateForm` create résumés with `emptyResumeLayout()`;
      legacy import builds the layout instead of link rows. `local-backup.ts`
      needs no change yet (backups hold whole collections incl. `layout`);
      converting old backups moves to phase 6
- [x] skill group pages: create/edit name only, `resolveSkillGroup` reuses a group
      by name and groups are no longer auto-deleted when unused; the list shows
      the union of skills used under the group (`skillsUsedUnderGroup`)
- [x] tests: `event-sourced-resume-workspace.test.ts` (7 tests on an in-memory
      app DB via `app-test-db.ts`)

### 5. Server side

- [x] `project-legacy.server.ts`: link collections removed from
      `tablesByCollection`; events for unknown collections are skipped and logged
- [x] `rebuild-event-log.server.ts`: `resumeOrderSources` and the order loop
      removed; `ownedViaParent` keeps only the bullet tables and AI messages
- [x] `library-references.ts` is now `ownedChildren` (experience → bullets,
      education → bullets). Deleting a library row deletes only owned children;
      layouts may keep dangling ids, which the assembler skips and compaction
      prunes. `admin-row-edit.server.ts` uses it; `admin-truncate.server.ts`
      needed no change
- [x] `compact-plan.ts`: merges repoint ids inside layouts (`replaceId`), skill
      groups merge by name (union of picked skills), prune reachability comes
      from layouts and is skipped while any résumé has no layout
- [x] legacy server path: `getResumeDetail` and the agentic read tools
      (`list_resumes`, `get_resume_document`, `search_resume_blocks`) read
      layouts; write tools, legacy server fns, old AI routes,
      `remote-resume-workspace.ts` and `scripts/import-resume.ts` deleted
- [x] experience list drops `resumeUsage`; skill group list derives its skills
      from layouts (`skillNamesByGroup`)

### 6. Migrate data (local DB)

- [x] `scripts/migrate-resume-layouts.ts` (dry run by default, `--write` to
      apply): builds each layout with the legacy rules
      (`modules/admin/layout-migration.ts`), merges skill groups by name and
      repoints layouts. Once the link tables are gone it reports "nothing to do"
- [x] verified: every résumé's assembled detail is unchanged (group ids aside)
- [x] client: link collections, schemas, `layoutFromLinks` fallback,
      `resume-item-order.ts` and the `*Order` fields removed. Old backups are
      upgraded on restore (`legacy-backup.ts`); their events are ignored
- [x] link tables removed from the drizzle schema, in two migrations because
      SQLite can't drop a column that a foreign key uses:
      `0009_smart_zodiak` drops the 15 link tables and rebuilds `resume_skill`
      without its `group_id` FK; `0010_wakeful_starbolt` drops `group_id`
- [x] event logs rebuilt: 2,965 → 542 events across 4 users (main user 539,
      0 orphans);
      `VACUUM` 178 MB → 4.5 MB. Backups: `.local-db/json-resume-latest.pre-layout.db`
      (before the script) and `.pre-drop.db` (before 0009/0010)
- [ ] browser: reload, accept the reset (the rebuild marker wipes the local DB
      and pulls), then run the browser checks under Verification

### 7. Production

Order matters: the data script reads the link tables, so it runs between the two
deploys.

- [ ] back up Turso (`sync_event` backup + `turso db shell … .dump`)
- [ ] expand: apply `0008` (adds `resume.layout`), then
      `npx tsx scripts/migrate-resume-layouts.ts` (dry run) and `--write`
- [ ] contract: deploy the new code, apply `0009` and `0010`, rebuild every
      event log, `VACUUM`
- [ ] re-enable the Turso lines in `apps/web/.env`

## Verification

- unit tests for layout helpers, `layoutFromLinks`, compaction/prune on layouts
- per-résumé detail equality before/after migration (all 14)
- browser: reorder experiences, pick bullets, pick skills in a group, clone a
  résumé, delete a library bullet that two résumés use
- event count after rebuild

## Settled questions

- Skill group library page edits the group's name only; skills are always picked
  per résumé.
- Section titles stay per résumé (in `layout.sections`).
