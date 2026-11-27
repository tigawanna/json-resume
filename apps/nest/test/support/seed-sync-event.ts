import { syncEvent } from '@repo/db/schema/sync-schema';
import type { DrizzleDB } from '../../src/database/database.module.js';

export async function seedSyncEvent({
  db,
  userId,
  key,
  collectionId = 'resume',
  type = 'insert',
  payload,
  serverTimestamp = new Date(),
  projectedAt,
}: {
  db: DrizzleDB;
  userId: string;
  key: string;
  collectionId?: string;
  type?: 'insert' | 'update' | 'delete';
  payload?: Record<string, unknown>;
  serverTimestamp?: Date;
  projectedAt?: Date;
}) {
  const [row] = await db
    .insert(syncEvent)
    .values({
      eventId: crypto.randomUUID(),
      userId,
      collectionId,
      type,
      key,
      payload:
        payload === undefined
          ? JSON.stringify({ id: key, userId, name: `Projected ${key}` })
          : JSON.stringify(payload),
      previous: null,
      txId: `test-${crypto.randomUUID()}`,
      clientId: 'test-client',
      schemaVersion: 1,
      clientTimestamp: serverTimestamp.getTime(),
      serverTimestamp,
      projectedAt,
    })
    .returning();
  return row;
}
