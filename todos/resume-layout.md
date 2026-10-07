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
  sections: { key: SectionKey; title: string; enabled: boolean }[];
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
- No foreign keys inside the JSON. Deleting a library row must strip its id from
  every layout (résumé updates instead of link-row deletes). Readers skip ids
  they can't resolve.
- One-time device reset after the event log rebuild.

## Phases

Each phase leaves the app working; old link tables are read as a fallback until
phase 6 drops them.

### 1. Layout module (pure, tested)

- [ ] `resumeLayoutSchema` (zod) + `emptyResumeLayout(sectionKeys)` in a shared
      file (`features/resume/resume-layout.ts`)
- [ ] helpers: `addEntity`, `removeEntity`, `moveEntity`, `setExperienceBullets`,
      `setGroupSkills`, `removeIdEverywhere(layout, id)`, `replaceId(layout, from, to)`
- [ ] `layoutFromLinks(resumeId, rows)` — builds a layout from today's link rows
      (same rules as `assembleResumeDetail`: legacy experiences with no bullet
      links show all bullets, legacy skills use `groupId`)
- [ ] unit tests

### 2. Schema: add the column (keep old tables)

- [ ] drizzle `resume.layout` (`text("layout", { mode: "json" })`), `db:generate`,
      `db:migrate` against the local DB
- [ ] client `resumeSchema.layout` optional; projection writes it like any column

### 3. Read path from layout (fallback to link rows when `layout` is missing)

- [ ] `assemble-resume-detail.ts` (sections, every list, bullets per experience,
      skills per group)
- [ ] `snapshot-resume.ts`, `use-event-sourced-resume-detail.ts`,
      `event-history.ts` (rows a résumé touches), `library-resolve.ts`
- [ ] test: for every résumé, detail from layout === detail from link rows

### 4. Write path to layout

- [ ] `event-sourced-resume-workspace.ts`: add / remove / reorder for every
      section, bullet selection per experience, skill selection per group
- [ ] replace `resume-item-order.ts`
- [ ] `clone-resume.ts` (a clone becomes one résumé insert with a copied layout)
- [ ] library deletes (`library-references.ts`): strip the id from layouts
- [ ] AI tools (`-ai/-utils/local-resume-tools.ts`), legacy import
      (`import-from-legacy/resume-import.ts`), `local-backup.ts` (version bump;
      old backups convert via `layoutFromLinks`)
- [ ] skill group pages: a group is a name; its skills are chosen per résumé
      (library page shows the union of skills used under that name)

### 5. Server side

- [ ] `project-legacy.server.ts`: drop link collections from `tablesByCollection`
- [ ] `rebuild-event-log.server.ts`: drop `resumeOrderSources` / `ownedViaParent`
      entries for removed tables
- [ ] `compact-plan.ts`: merges repoint ids inside layouts (`replaceId`); prune
      reachability comes from layouts; skill groups merge by name
- [ ] admin rules (`admin-row-edit.server.ts`, `admin-truncate.server.ts`)
- [ ] legacy server resume path (`resume.server.ts`, `resume.functions.ts`,
      `features/agentic-tools/resume-tools.server.ts`): port to layout or delete;
      `remote-resume-workspace.ts` has no importers — delete

### 6. Migrate data (local DB)

- [ ] script: write `layout` for every résumé from its link rows; merge skill
      groups by name and repoint layouts
- [ ] verify every résumé's assembled detail is unchanged (group ids aside)
- [ ] remove link tables from the drizzle schema, `db:generate`, `db:migrate`
- [ ] rebuild every event log → expect ~540 events for the main user; `VACUUM`

### 7. Production

- [ ] back up Turso (`sync_event` backup + `turso db shell … .dump`)
- [ ] deploy code, run migrations + data script against Turso, rebuild logs
- [ ] re-enable the Turso lines in `apps/web/.env`

## Verification

- unit tests for layout helpers, `layoutFromLinks`, compaction/prune on layouts
- per-résumé detail equality before/after migration (all 14)
- browser: reorder experiences, pick bullets, pick skills in a group, clone a
  résumé, delete a library bullet that two résumés use
- event count after rebuild

## Open questions

- Skill group library page: edit the group's name only, or also a default skill
  list that new résumés start from?
- Section titles stay per résumé (as today) — confirm.
