import type { DrizzleDB } from "../../database/database.module.js";
import { AdminTableMetadataService } from "./admin-table-metadata.service.js";
import { readSyncedRow } from "./admin-row-events.js";
import { ownerOf } from "./admin-row-ownership.js";
import { collectionForTable, type CollectionId } from "./admin-table-registry.js";

type Row = Record<string, unknown>;
export type SyncedTarget = {
  collectionId: CollectionId;
  id: string;
  userId: string;
  row: Row;
};

function syncKeyOf({ table, row }: { table: string; row: Record<string, unknown> }) {
  if (typeof row.id === "string") return row.id;
  if (typeof row.id === "number" || typeof row.id === "bigint") return row.id.toString();
  throw new Error(`${table} row has no usable id, so no sync event can be written`);
}

export async function resolveSyncedTarget({
  db,
  metadata,
  table,
  rowKey,
}: {
  db: DrizzleDB;
  metadata: AdminTableMetadataService;
  table: string;
  rowKey: string;
}): Promise<SyncedTarget | null> {
  const collectionId = collectionForTable({ table });
  if (!collectionId) return null;
  const id = syncKeyOf({
    table,
    row: await metadata.readRawRow({ table, rowKey }),
  });
  const row = await readSyncedRow({ db, collectionId, id });
  const userId = await ownerOf({ db, collectionId, row });
  return { collectionId, id, userId, row };
}
