import { Inject, Injectable } from "@nestjs/common";
import { user } from "@repo/db/postgres/schema/auth-schema";
import { syncEvent } from "@repo/db/postgres/schema/sync-schema";
import { count, eq, notInArray } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../database/database.module.js";
import { EventLogProjectionService } from "../../sync/event-log-projection.service.js";
import { toPayload } from "../tables/admin-sync-payload.js";
import { EventLogRebuildRows } from "./event-log-rebuild-rows.service.js";

type RebuildUserResult = {
  previousEvents: number;
  insertedEvents: number;
  projectedFirst: number;
  byCollection: Record<string, number>;
};
type RebuildAllResult = {
  users: number;
  previousEvents: number;
  insertedEvents: number;
  orphanEvents: number;
  projectedFirst: number;
};

const CLIENT_ID = "server-rebuild";
const RESET_COLLECTION = "__sync_reset__";
const INSERT_CHUNK = 50;

@Injectable()
export class EventLogRebuildService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly rows: EventLogRebuildRows,
    private readonly projection: EventLogProjectionService,
  ) {}

  async user({ userId, projectFirst = true }: { userId: string; projectFirst?: boolean }) {
    const projectedFirst = projectFirst ? await this.projection.catchUp() : 0;
    const rowsByCollection = await this.rows.loadRows({ userId });
    const now = new Date();
    const txId = `rebuild-${crypto.randomUUID()}`;
    const byCollection: Record<string, number> = {};
    const values: Array<typeof syncEvent.$inferInsert> = [];
    for (const [collectionId, rows] of rowsByCollection) {
      byCollection[collectionId] = rows.length;
      for (const row of rows) {
        const payload = toPayload({ row });
        values.push({
          eventId: crypto.randomUUID(),
          userId,
          collectionId,
          type: "insert",
          key: String(row.id),
          payload: JSON.stringify(payload),
          previous: null,
          txId,
          clientId: CLIENT_ID,
          schemaVersion: 1,
          clientTimestamp:
            typeof payload.updatedAt === "number" ? payload.updatedAt : now.getTime(),
          projectedAt: now,
        });
      }
    }
    const [previous] = await this.db
      .select({ n: count() })
      .from(syncEvent)
      .where(eq(syncEvent.userId, userId));
    const marker = resetMarker({ userId, txId, now, events: values.length });
    await this.db.transaction(async (tx) => {
      await tx.delete(syncEvent).where(eq(syncEvent.userId, userId));
      for (let index = 0; index < values.length; index += INSERT_CHUNK)
        await tx.insert(syncEvent).values(values.slice(index, index + INSERT_CHUNK));
      await tx.insert(syncEvent).values(marker);
    });
    return {
      previousEvents: previous?.n ?? 0,
      insertedEvents: values.length,
      projectedFirst,
      byCollection,
    } satisfies RebuildUserResult;
  }

  async all() {
    const projectedFirst = await this.projection.catchUp();
    const [before] = await this.db.select({ n: count() }).from(syncEvent);
    const userIds = (await this.db.select({ id: user.id }).from(user)).map((row) => row.id);
    let insertedEvents = 0;
    for (const userId of userIds) {
      const result = await this.user({ userId, projectFirst: false });
      insertedEvents += result.insertedEvents + 1;
    }
    const orphans = await this.db
      .delete(syncEvent)
      .where(notInArray(syncEvent.userId, this.db.select({ id: user.id }).from(user)));
    return {
      users: userIds.length,
      previousEvents: before?.n ?? 0,
      insertedEvents,
      orphanEvents: orphans.rowCount ?? 0,
      projectedFirst,
    } satisfies RebuildAllResult;
  }
}

function resetMarker({
  userId,
  txId,
  now,
  events,
}: {
  userId: string;
  txId: string;
  now: Date;
  events: number;
}): typeof syncEvent.$inferInsert {
  return {
    eventId: crypto.randomUUID(),
    userId,
    collectionId: RESET_COLLECTION,
    type: "insert",
    key: userId,
    payload: JSON.stringify({ rebuiltAt: now.getTime(), events }),
    previous: null,
    txId,
    clientId: CLIENT_ID,
    schemaVersion: 1,
    clientTimestamp: now.getTime(),
    projectedAt: now,
  };
}
