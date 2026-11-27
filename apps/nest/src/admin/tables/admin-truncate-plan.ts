import { sql } from "drizzle-orm";
import type { DrizzleDB } from "../../database/database.module.js";
import { AdminTableMetadataService } from "./admin-table-metadata.service.js";
import {
  dependentTables,
  ruleCollections,
  rowsToDeleteWith,
  SET_NULL_ON_DELETE,
} from "./admin-row-ownership.js";
import {
  collectionForTable,
  isLocalOnlyTable,
  tableForCollection,
  tableNameForCollection,
  rowModeFor,
} from "./admin-table-registry.js";
import { cutoffColumnsOf, whereFor } from "./admin-truncate-where.js";
import { createOwnerResolver } from "./admin-truncate-owners.js";
import type { DeleteTarget, TruncateCutoff, TruncatePlan } from "./admin-truncate.types.js";

export async function planTruncate({
  db,
  metadata,
  table,
  cutoff,
}: {
  db: DrizzleDB;
  metadata: AdminTableMetadataService;
  table: string;
  cutoff?: TruncateCutoff;
}): Promise<TruncatePlan> {
  const name = await metadata.requireTable({ table });
  const isEventLog = name === "sync_event";
  const mode = isEventLog ? "eventLog" : rowModeFor({ table: name });
  const columns = await metadata.columns({ table: name });
  const cutoffColumns = isEventLog ? [] : cutoffColumnsOf({ columns });
  const where = whereFor({
    table: name,
    columns,
    cutoff: isEventLog ? undefined : cutoff,
  });
  const plan: TruncatePlan = {
    table: name,
    mode,
    backups: [],
    cutoffColumns,
    rows: 0,
    references: [],
    blockedBy: [],
    cascades: [],
    targets: [],
    where,
  };
  if (mode === "readonly") return plan;
  plan.rows = await metadata.count({
    table: name,
    where,
  });
  if (isEventLog) return plan;

  const collectionId = mode === "synced" ? collectionForTable({ table: name }) : null;
  if (collectionId) await planSyncedTargets({ db, plan, collectionId, where });

  const handledTables = collectionId ? dependentTables({ collectionId }) : new Set<string>();
  for (const key of await metadata.referencingForeignKeys({ table: name })) {
    if (handledTables.has(key.table)) continue;
    if (SET_NULL_ON_DELETE.has(`${key.table}.${key.from}`)) continue;
    const counted = await db.execute(sql`
      select count(*) as n from ${sql.identifier(key.table)}
      where ${sql.identifier(key.from)} in (
        select ${sql.identifier(key.to || "id")} from ${sql.identifier(name)} where ${where}
      )
    `);
    const rows = Number(counted.rows[0]?.n ?? 0);
    if (rows === 0) continue;
    const entry = { table: key.table, column: key.from, rows };
    if (collectionForTable({ table: key.table }) || isLocalOnlyTable({ table: key.table }))
      plan.blockedBy.push(entry);
    else plan.cascades.push(entry);
  }
  return plan;
}

async function planSyncedTargets({
  db,
  plan,
  collectionId,
  where,
}: {
  db: DrizzleDB;
  plan: TruncatePlan;
  collectionId: NonNullable<ReturnType<typeof collectionForTable>>;
  where: TruncatePlan["where"];
}) {
  const ownerOf = createOwnerResolver({ db });
  const parents = await db.select().from(tableForCollection({ collectionId }));
  const selected = await db.execute(sql`
    select id from ${sql.identifier(plan.table)} where ${where}
  `);
  const targetIds = new Set(
    selected.rows.flatMap((row) => (typeof row.id === "string" ? [row.id] : [])),
  );
  const children = new Map<string, Array<Record<string, unknown>>>();
  for (const childId of ruleCollections({ collectionId })) {
    children.set(childId, await db.select().from(tableForCollection({ collectionId: childId })));
  }
  const seen = new Set<string>();
  const dependents: DeleteTarget[] = [];
  for (const parent of parents) {
    if (typeof parent.id !== "string" || !targetIds.has(parent.id)) continue;
    plan.targets.push({
      collectionId,
      row: parent,
      userId: await ownerOf({ collectionId, row: parent }),
    });
    const rowsOf = ({ collectionId: id }: { collectionId: string }) => children.get(id) ?? [];
    for (const dependent of rowsToDeleteWith({
      collectionId,
      parentId: parent.id,
      rowsOf,
    })) {
      const key = `${dependent.collectionId}:${dependent.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const row = children.get(dependent.collectionId)?.find((child) => child.id === dependent.id);
      if (!row) continue;
      dependents.push({
        collectionId: dependent.collectionId,
        row,
        userId: await ownerOf({ collectionId: dependent.collectionId, row }),
      });
    }
  }
  const counts = new Map<string, number>();
  for (const dependent of dependents) {
    const name = tableNameForCollection({
      collectionId: dependent.collectionId,
    });
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  plan.references = [...counts].map(([name, rows]) => ({ table: name, rows }));
  plan.targets = [...dependents, ...plan.targets];
}
