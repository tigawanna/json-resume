import { bulletKey, libraryKeys, skillGroupKey } from "@/modules/library/library-keys";
import { parentRules, rowsToDeleteWith } from "@/modules/library/library-references";

type Row = Record<string, unknown>;

export type CompactionOp = {
  collectionId: string;
  type: "insert" | "update" | "delete";
  id: string;
  row: Row;
};

export type CompactionPlan = {
  ops: CompactionOp[];
  merged: Record<string, number>;
  /** Rows removed because no résumé reaches them, per collection (only with `prune`). */
  pruned: Record<string, number>;
};

/** Join tables and the pair that must be unique in each. */
const JOINS = [
  { collectionId: "resumeContactItem", owner: "resumeId", entity: "contactId" },
  { collectionId: "resumeLinkItem", owner: "resumeId", entity: "linkId" },
  { collectionId: "resumeSummaryItem", owner: "resumeId", entity: "summaryId" },
  { collectionId: "resumeNoteItem", owner: "resumeId", entity: "noteId" },
  { collectionId: "resumeExperienceItem", owner: "resumeId", entity: "experienceId" },
  { collectionId: "resumeExperienceBulletItem", owner: "resumeId", entity: "bulletId" },
  { collectionId: "resumeEducationItem", owner: "resumeId", entity: "educationId" },
  { collectionId: "resumeProjectItem", owner: "resumeId", entity: "projectId" },
  { collectionId: "resumeSkillGroupItem", owner: "resumeId", entity: "groupId" },
  { collectionId: "resumeTalkItem", owner: "resumeId", entity: "talkId" },
  { collectionId: "resumeCertificationItem", owner: "resumeId", entity: "certificationId" },
  { collectionId: "resumeVolunteerItem", owner: "resumeId", entity: "volunteerId" },
  { collectionId: "resumeLanguageItem", owner: "resumeId", entity: "languageId" },
  { collectionId: "resumeSkillGroupSkill", owner: "groupId", entity: "skillId" },
] as const;

const JOIN_IDS = new Set<string>(JOINS.map((join) => join.collectionId));

/** `resume.<field>` order arrays, rebuilt from junction sort order. */
const ORDER_SOURCES = {
  experienceOrder: { collectionId: "resumeExperienceItem", entity: "experienceId" },
  educationOrder: { collectionId: "resumeEducationItem", entity: "educationId" },
  projectOrder: { collectionId: "resumeProjectItem", entity: "projectId" },
  talkOrder: { collectionId: "resumeTalkItem", entity: "talkId" },
} as const;

function ms(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  return typeof value === "number" ? value : 0;
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function bySortOrder(a: Row, b: Row) {
  return num(a.sortOrder) - num(b.sortOrder);
}

class WorkingSet {
  private readonly tables = new Map<string, Map<string, Row>>();
  private readonly original = new Map<string, Map<string, Row>>();
  private readonly dirty = new Map<string, Set<string>>();

  constructor(
    input: Record<string, ReadonlyArray<Row>>,
    readonly now: Date,
    private readonly newId: () => string,
  ) {
    for (const [collectionId, rows] of Object.entries(input)) {
      const table = new Map<string, Row>();
      for (const row of rows) if (typeof row.id === "string") table.set(row.id, { ...row });
      this.tables.set(collectionId, table);
      this.original.set(collectionId, new Map(table));
    }
  }

  private table(collectionId: string) {
    let table = this.tables.get(collectionId);
    if (!table) {
      table = new Map();
      this.tables.set(collectionId, table);
      this.original.set(collectionId, new Map());
    }
    return table;
  }

  collections(): string[] {
    return [...this.tables.keys()];
  }

  rows(collectionId: string): Row[] {
    return [...this.table(collectionId).values()];
  }

  size(collectionId: string) {
    return this.table(collectionId).size;
  }

  has(collectionId: string, id: string) {
    return this.table(collectionId).has(id);
  }

  /** Loaded and then deleted by this plan; a row that was never loaded is not "removed". */
  removed(collectionId: string, id: string) {
    return Boolean(this.original.get(collectionId)?.has(id)) && !this.has(collectionId, id);
  }

  set(collectionId: string, id: string, patch: Row) {
    const table = this.table(collectionId);
    const current = table.get(id);
    if (!current) return;
    table.set(id, { ...current, ...patch, updatedAt: this.now });
    let dirty = this.dirty.get(collectionId);
    if (!dirty) this.dirty.set(collectionId, (dirty = new Set()));
    dirty.add(id);
  }

  insert(collectionId: string, row: Row) {
    const id = this.newId();
    this.table(collectionId).set(id, { ...row, id, createdAt: this.now, updatedAt: this.now });
  }

  delete(collectionId: string, id: string) {
    this.table(collectionId).delete(id);
  }

  diff() {
    const deletes: CompactionOp[] = [];
    const updates: CompactionOp[] = [];
    const inserts: CompactionOp[] = [];
    for (const [collectionId, table] of this.tables) {
      const before = this.original.get(collectionId) ?? new Map<string, Row>();
      const dirty = this.dirty.get(collectionId) ?? new Set<string>();
      // Deletes carry the full row, like client deletes, so a backup of the log can restore it.
      for (const [id, row] of before) {
        if (!table.has(id)) deletes.push({ collectionId, type: "delete", id, row });
      }
      for (const [id, row] of table) {
        if (!before.has(id)) inserts.push({ collectionId, type: "insert", id, row });
        else if (dirty.has(id)) updates.push({ collectionId, type: "update", id, row });
      }
    }
    return { deletes, updates, inserts };
  }
}

function pickSurvivor(rows: Row[]): Row {
  return rows.reduce((best, row) => (ms(row.updatedAt) > ms(best.updatedAt) ? row : best));
}

/** Points everything that referenced `from` at `to`, then drops `from`. */
function absorb(state: WorkingSet, collectionId: string, from: string, to: string) {
  const rule = parentRules[collectionId];
  for (const ref of [...(rule?.references ?? []), ...(rule?.owned ?? [])]) {
    for (const row of state.rows(ref.collectionId)) {
      if (row[ref.field] === from && typeof row.id === "string") {
        state.set(ref.collectionId, row.id, { [ref.field]: to });
      }
    }
  }
  state.delete(collectionId, from);
}

function mergeBy(
  state: WorkingSet,
  collectionId: string,
  keyOf: (row: Row) => string | null,
): number {
  const groups = new Map<string, Row[]>();
  for (const row of state.rows(collectionId)) {
    const key = keyOf(row);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  let merged = 0;
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const survivor = pickSurvivor(rows);
    for (const row of rows) {
      if (row === survivor || typeof row.id !== "string" || typeof survivor.id !== "string") {
        continue;
      }
      absorb(state, collectionId, row.id, survivor.id);
      merged++;
    }
  }
  return merged;
}

/**
 * After repointing, keep one join row per (owner, entity) and drop rows whose
 * entity this plan deleted. Entities outside the loaded set (e.g. legacy rows
 * with a null `user_id`) are not missing, so their joins stay.
 */
function dedupeJoins(state: WorkingSet, parents: Record<string, string>) {
  for (const join of JOINS) {
    const seen = new Set<string>();
    for (const row of state.rows(join.collectionId).sort(bySortOrder)) {
      if (typeof row.id !== "string") continue;
      const entityCollection = parents[join.entity];
      const entityId = row[join.entity];
      if (
        entityCollection &&
        typeof entityId === "string" &&
        state.removed(entityCollection, entityId)
      ) {
        state.delete(join.collectionId, row.id);
        continue;
      }
      const pair = `${String(row[join.owner])}\u241f${String(entityId)}`;
      if (seen.has(pair)) state.delete(join.collectionId, row.id);
      else seen.add(pair);
    }
  }
}

/** Skills used to belong to one group through `groupId`; give each a group link instead. */
function migrateLegacySkills(state: WorkingSet, userId: string) {
  const linked = new Set(
    state
      .rows("resumeSkillGroupSkill")
      .map((link) => `${String(link.groupId)}\u241f${String(link.skillId)}`),
  );
  for (const skill of state.rows("resumeSkill")) {
    if (typeof skill.id !== "string") continue;
    const groupId = skill.groupId;
    if (typeof groupId === "string") {
      if (state.has("resumeSkillGroup", groupId) && !linked.has(`${groupId}\u241f${skill.id}`)) {
        state.insert("resumeSkillGroupSkill", {
          groupId,
          skillId: skill.id,
          sortOrder: num(skill.sortOrder),
        });
        linked.add(`${groupId}\u241f${skill.id}`);
      }
      state.set("resumeSkill", skill.id, { groupId: null, userId });
    } else if (skill.userId == null) {
      state.set("resumeSkill", skill.id, { userId });
    }
  }
}

/**
 * Experiences with no bullet links showed every bullet on every résumé that
 * used them. Link those résumés to exactly those bullets before merging, so
 * no résumé gains or loses a bullet.
 */
function backfillBulletLinks(state: WorkingSet) {
  const linkedBullets = new Set(
    state.rows("resumeExperienceBulletItem").map((item) => String(item.bulletId)),
  );
  for (const experience of state.rows("resumeExperience")) {
    const bullets = state
      .rows("resumeExperienceBullet")
      .filter((bullet) => bullet.experienceId === experience.id)
      .sort(bySortOrder);
    if (bullets.length === 0) continue;
    if (bullets.some((bullet) => linkedBullets.has(String(bullet.id)))) continue;
    const resumeIds = new Set(
      state
        .rows("resumeExperienceItem")
        .filter((item) => item.experienceId === experience.id)
        .map((item) => String(item.resumeId)),
    );
    for (const resumeId of resumeIds) {
      bullets.forEach((bullet, sortOrder) => {
        state.insert("resumeExperienceBulletItem", { resumeId, bulletId: bullet.id, sortOrder });
      });
    }
  }
}

function groupSkillIds(state: WorkingSet, groupId: unknown): string[] {
  return state
    .rows("resumeSkillGroupSkill")
    .filter((link) => link.groupId === groupId)
    .sort(bySortOrder)
    .map((link) => String(link.skillId));
}

function rebuildOrders(state: WorkingSet, touched: Set<string>) {
  for (const resume of state.rows("resume")) {
    if (typeof resume.id !== "string" || !touched.has(resume.id)) continue;
    const patch: Row = {};
    for (const [field, source] of Object.entries(ORDER_SOURCES)) {
      patch[field] = state
        .rows(source.collectionId)
        .filter((item) => item.resumeId === resume.id)
        .sort(bySortOrder)
        .map((item) => String(item[source.entity]));
    }
    state.set("resume", resume.id, patch);
  }
}

const ENTITY_FOR_FIELD: Record<string, string> = {
  contactId: "resumeContact",
  linkId: "resumeLink",
  summaryId: "resumeSummary",
  noteId: "resumeNote",
  experienceId: "resumeExperience",
  bulletId: "resumeExperienceBullet",
  educationId: "resumeEducation",
  projectId: "resumeProject",
  groupId: "resumeSkillGroup",
  talkId: "resumeTalk",
  certificationId: "resumeCertification",
  volunteerId: "resumeVolunteer",
  languageId: "resumeLanguage",
  skillId: "resumeSkill",
};

function idsReached(
  state: WorkingSet,
  joinId: string,
  owners: Set<string>,
  ownerField: string,
  field: string,
): Set<string> {
  return new Set(
    state
      .rows(joinId)
      .filter((row) => owners.has(String(row[ownerField])))
      .map((row) => String(row[field])),
  );
}

/**
 * Deletes library rows no résumé reaches, with the links and owned rows that
 * go with them. A collection is only pruned when it and its join were both
 * loaded; otherwise a missing join would look like "nothing reaches it".
 * Skills are reached through a surviving group, so they go last.
 */
function pruneUnreferenced(state: WorkingSet, loaded: Set<string>) {
  function drop(collectionId: string, keep: Set<string>) {
    for (const row of state.rows(collectionId)) {
      if (typeof row.id !== "string" || keep.has(row.id)) continue;
      for (const dependent of rowsToDeleteWith(collectionId, row.id, (c) => state.rows(c))) {
        state.delete(dependent.collectionId, dependent.id);
      }
      state.delete(collectionId, row.id);
    }
  }

  if (!loaded.has("resume")) return;
  const resumes = new Set(state.rows("resume").map((row) => String(row.id)));
  for (const join of JOINS) {
    if (join.owner !== "resumeId") continue;
    const collectionId = ENTITY_FOR_FIELD[join.entity];
    if (!collectionId || !loaded.has(collectionId) || !loaded.has(join.collectionId)) continue;
    drop(collectionId, idsReached(state, join.collectionId, resumes, "resumeId", join.entity));
  }
  if (loaded.has("resumeSkill") && loaded.has("resumeSkillGroupSkill")) {
    const groups = new Set(state.rows("resumeSkillGroup").map((row) => String(row.id)));
    drop("resumeSkill", idsReached(state, "resumeSkillGroupSkill", groups, "groupId", "skillId"));
  }
}

/**
 * One user's rows in, the events that collapse them to unique library rows
 * out. With `prune`, rows no résumé reaches are deleted as well. Ordered so each event projects cleanly: join deletes free unique
 * slots, updates repoint children before their old parent is deleted.
 */
export function planCompaction(
  input: Record<string, ReadonlyArray<Row>>,
  options: { userId: string; now?: Date; newId?: () => string; prune?: boolean },
): CompactionPlan {
  const state = new WorkingSet(
    input,
    options.now ?? new Date(),
    options.newId ?? (() => crypto.randomUUID()),
  );
  const merged: Record<string, number> = {};

  migrateLegacySkills(state, options.userId);
  backfillBulletLinks(state);

  for (const [collectionId, keyOf] of Object.entries(libraryKeys)) {
    merged[collectionId] = mergeBy(state, collectionId, keyOf);
  }
  merged.resumeExperienceBullet = mergeBy(state, "resumeExperienceBullet", (row) =>
    typeof row.experienceId === "string" && typeof row.text === "string"
      ? bulletKey({ experienceId: row.experienceId, text: row.text })
      : null,
  );
  dedupeJoins(state, ENTITY_FOR_FIELD);
  merged.resumeSkillGroup = mergeBy(state, "resumeSkillGroup", (row) =>
    typeof row.name === "string" ? skillGroupKey(row.name, groupSkillIds(state, row.id)) : null,
  );
  dedupeJoins(state, ENTITY_FOR_FIELD);

  const pruned: Record<string, number> = {};
  if (options.prune) {
    const sizes = new Map(state.collections().map((id) => [id, state.size(id)]));
    pruneUnreferenced(state, new Set(Object.keys(input)));
    for (const [collectionId, size] of sizes) {
      const removed = size - state.size(collectionId);
      if (removed > 0) pruned[collectionId] = removed;
    }
  }

  const first = state.diff();
  const touched = new Set<string>();
  for (const op of [...first.deletes, ...first.updates, ...first.inserts]) {
    if (!Object.values(ORDER_SOURCES).some((source) => source.collectionId === op.collectionId)) {
      continue;
    }
    const resumeId = input[op.collectionId]?.find((row) => row.id === op.id)?.resumeId;
    if (typeof resumeId === "string") touched.add(resumeId);
    if (typeof op.row.resumeId === "string") touched.add(op.row.resumeId);
  }
  rebuildOrders(state, touched);

  const { deletes, updates, inserts } = state.diff();
  const isJoin = (op: CompactionOp) => JOIN_IDS.has(op.collectionId);
  const bulletsFirst = (a: CompactionOp, b: CompactionOp) =>
    Number(b.collectionId === "resumeExperienceBullet") -
    Number(a.collectionId === "resumeExperienceBullet");

  return {
    ops: [
      ...deletes.filter(isJoin),
      ...updates.filter((op) => !isJoin(op)),
      ...updates.filter(isJoin),
      ...inserts,
      ...deletes.filter((op) => !isJoin(op)).sort(bulletsFirst),
    ],
    merged,
    pruned,
  };
}
