import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { syncEvent } from "@repo/db/postgres/schema/sync-schema";
import { getTableColumns, inArray, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../database/database.module.js";
import { AdminAuditService, type AdminActor } from "../audit/admin-audit.service.js";
import { AdminTableMetadataService } from "./admin-table-metadata.service.js";
import { toPayload } from "./admin-sync-payload.js";
import { tableForCollection, type CollectionId } from "./admin-table-registry.js";
import { planTruncate } from "./admin-truncate-plan.js";
import { AdminTruncateEventLogService } from "./admin-truncate-event-log.service.js";
import type { TruncateCutoff, TruncatePlan } from "./admin-truncate.types.js";

@Injectable()
export class AdminTruncateService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly metadata: AdminTableMetadataService,
    private readonly eventLog: AdminTruncateEventLogService,
    private readonly audit: AdminAuditService,
  ) {}

  async preview({ table, cutoff }: { table: string; cutoff?: TruncateCutoff }) {
    const plan = await planTruncate({
      db: this.db,
      metadata: this.metadata,
      table,
      cutoff,
    });
    return {
      table: plan.table,
      mode: plan.mode,
      backups: plan.mode === "eventLog" ? await this.eventLog.preview() : plan.backups,
      cutoffColumns: plan.cutoffColumns,
      rows: plan.rows,
      references: plan.references,
      blockedBy: plan.blockedBy,
      cascades: plan.cascades,
    };
  }

  truncate({
    actor,
    ...input
  }: {
    actor: AdminActor;
    table: string;
    confirm: string;
    cutoff?: TruncateCutoff;
    rebuild?: boolean;
  }) {
    return this.audit.run({
      action: "truncate-table",
      actor,
      input: {
        table: input.table,
        cutoff: input.cutoff,
        rebuild: input.rebuild,
      },
      execute: () => this.truncateTable(input),
    });
  }

  private async truncateTable({
    table,
    confirm,
    cutoff,
    rebuild,
  }: {
    table: string;
    confirm: string;
    cutoff?: TruncateCutoff;
    rebuild?: boolean;
  }) {
    if (confirm !== table) throw new BadRequestException("Type the table name to confirm");
    const plan = await planTruncate({
      db: this.db,
      metadata: this.metadata,
      table,
      cutoff,
    });
    if (plan.mode === "readonly") throw new BadRequestException(`${plan.table} is read-only`);
    if (plan.mode === "eventLog") {
      return this.eventLog.truncate({ rebuild });
    }
    if (plan.blockedBy.length > 0) {
      const first = plan.blockedBy[0];
      throw new BadRequestException(
        `${first?.rows} row(s) in ${first?.table} still reference these rows. Truncate that table first.`,
      );
    }
    if (plan.mode === "direct") {
      const result = await this.db.execute(sql`
        delete from ${sql.identifier(plan.table)} where ${plan.where}
      `);
      return {
        mode: plan.mode,
        deleted: result.rowCount ?? 0,
        references: 0,
        events: 0,
      };
    }
    return this.truncateSynced({ plan });
  }

  private async truncateSynced({ plan }: { plan: TruncatePlan }) {
    const now = new Date();
    const txId = `admin-truncate-${crypto.randomUUID()}`;
    const idsByCollection = new Map<CollectionId, string[]>();
    for (const target of plan.targets) {
      if (typeof target.row.id !== "string") continue;
      const ids = idsByCollection.get(target.collectionId) ?? [];
      ids.push(target.row.id);
      idsByCollection.set(target.collectionId, ids);
    }
    const events = plan.targets.flatMap((target): Array<typeof syncEvent.$inferInsert> => {
      if (!target.userId || typeof target.row.id !== "string") return [];
      return [
        {
          eventId: crypto.randomUUID(),
          userId: target.userId,
          collectionId: target.collectionId,
          type: "delete",
          key: target.row.id,
          payload: JSON.stringify(toPayload({ row: target.row })),
          previous: null,
          txId,
          clientId: "server-admin",
          schemaVersion: 1,
          clientTimestamp: now.getTime(),
          projectedAt: now,
        },
      ];
    });
    await this.db.transaction(async (tx) => {
      for (const [collectionId, ids] of idsByCollection) {
        const table = tableForCollection({ collectionId });
        const idColumn = getTableColumns(table).id;
        if (!idColumn) continue;
        for (const part of chunk({ items: ids, size: 400 })) {
          await tx.delete(table).where(inArray(idColumn, part));
        }
      }
      for (const part of chunk({ items: events, size: 50 }))
        await tx.insert(syncEvent).values(part);
    });
    return {
      mode: plan.mode,
      deleted: plan.rows,
      references: plan.targets.length - plan.rows,
      events: events.length,
    };
  }
}

function chunk<T>({ items, size }: { items: T[]; size: number }) {
  const parts: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    parts.push(items.slice(index, index + size));
  return parts;
}
