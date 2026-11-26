import { syncEvent } from '@repo/db/schema/sync-schema';
import { eq, getTableColumns } from 'drizzle-orm';
import type { DrizzleDB } from '../../database/database.module.js';
import {
  tableForCollection,
  type CollectionId,
} from './admin-table-registry.js';
import { toPayload } from './admin-sync-payload.js';

type Row = Record<string, unknown>;
type Reader = Pick<DrizzleDB, 'select'>;
export type AdminTransaction = Parameters<
  Parameters<DrizzleDB['transaction']>[0]
>[0];

export async function readSyncedRow({
  db,
  collectionId,
  id,
}: {
  db: Reader;
  collectionId: CollectionId;
  id: string;
}): Promise<Row> {
  const columns = getTableColumns(tableForCollection({ collectionId }));
  if (!columns.id) throw new Error(`${collectionId} has no id column`);
  const [row] = await db
    .select()
    .from(tableForCollection({ collectionId }))
    .where(eq(columns.id, id))
    .limit(1);
  if (!row) throw new Error(`${collectionId} row ${id} not found`);
  return row;
}

export async function appendAdminEvent({
  tx,
  collectionId,
  userId,
  type,
  row,
  txId,
}: {
  tx: AdminTransaction;
  collectionId: CollectionId;
  userId: string;
  type: 'update' | 'delete';
  row: Row;
  txId?: string;
}) {
  const now = new Date();
  await tx.insert(syncEvent).values({
    eventId: crypto.randomUUID(),
    userId,
    collectionId,
    type,
    key: String(row.id),
    payload: JSON.stringify(toPayload({ row })),
    previous: null,
    txId: txId ?? `admin-${crypto.randomUUID()}`,
    clientId: 'server-admin',
    schemaVersion: 1,
    clientTimestamp: now.getTime(),
    projectedAt: now,
  });
}
