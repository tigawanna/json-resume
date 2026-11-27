import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../database/database.module.js";
import { AdminAuditService, type AdminActor } from "../audit/admin-audit.service.js";
import { AdminTableMetadataService } from "./admin-table-metadata.service.js";
import { appendAdminEvent } from "./admin-row-events.js";
import {
  dependentTables,
  rowsToDeleteWithFromDb,
  SET_NULL_ON_DELETE,
} from "./admin-row-ownership.js";
import { rowModeFor, tableForCollection, type CollectionId } from "./admin-table-registry.js";
import { resolveSyncedTarget } from "./admin-row-target.js";

type Row = Record<string, unknown>;
type Dependent = { collectionId: CollectionId; id: string; row: Row };

@Injectable()
export class AdminRowDeleteService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly metadata: AdminTableMetadataService,
    private readonly audit: AdminAuditService,
  ) {}

  remove({ actor, table, rowKey }: { actor: AdminActor; table: string; rowKey: string }) {
    return this.audit.run({
      action: "delete-row",
      actor,
      input: { table, rowKey },
      execute: () => this.removeRow({ table, rowKey }),
    });
  }

  private async removeRow({ table, rowKey }: { table: string; rowKey: string }) {
    const name = await this.metadata.requireTable({ table });
    const mode = rowModeFor({ table: name });
    if (mode === "readonly") throw new BadRequestException(`${name} is read-only`);
    const target =
      mode === "synced"
        ? await resolveSyncedTarget({
            db: this.db,
            metadata: this.metadata,
            table: name,
            rowKey,
          })
        : null;
    const dependents = target
      ? await this.dependentsOf({
          collectionId: target.collectionId,
          parentId: target.id,
        })
      : [];
    if (target)
      await this.assertNoChildren({
        table: name,
        rowKey,
        handled: dependentTables({ collectionId: target.collectionId }),
      });

    await this.db.transaction(async (tx) => {
      if (target) {
        for (const dependent of dependents) {
          const columns = getTableColumns(
            tableForCollection({ collectionId: dependent.collectionId }),
          );
          if (!columns.id) continue;
          await tx
            .delete(tableForCollection({ collectionId: dependent.collectionId }))
            .where(eq(columns.id, dependent.id));
          await appendAdminEvent({
            tx,
            collectionId: dependent.collectionId,
            userId: target.userId,
            type: "delete",
            row: dependent.row,
          });
        }
      }
      const where = await this.metadata.rowKeyWhere({ table: name, rowKey });
      const result = await tx.execute(sql`delete from ${sql.identifier(name)} where ${where}`);
      if ((result.rowCount ?? 0) === 0)
        throw new NotFoundException(`Row no longer exists in ${name}`);
      if (target)
        await appendAdminEvent({
          tx,
          ...target,
          type: "delete",
          row: target.row,
        });
    });
    return { mode, deletedReferences: dependents.length };
  }

  private async dependentsOf({
    collectionId,
    parentId,
  }: {
    collectionId: CollectionId;
    parentId: string;
  }): Promise<Dependent[]> {
    const references = await rowsToDeleteWithFromDb({
      db: this.db,
      collectionId,
      parentId,
    });
    const idsByCollection = new Map<CollectionId, string[]>();
    for (const reference of references) {
      const ids = idsByCollection.get(reference.collectionId) ?? [];
      ids.push(reference.id);
      idsByCollection.set(reference.collectionId, ids);
    }
    const loaded = new Map<CollectionId, Row[]>();
    for (const [childId, ids] of idsByCollection) {
      const table = tableForCollection({ collectionId: childId });
      const idColumn = getTableColumns(table).id;
      if (!idColumn) continue;
      loaded.set(childId, await this.db.select().from(table).where(inArray(idColumn, ids)));
    }
    return references.flatMap((reference) => {
      const row = loaded
        .get(reference.collectionId)
        ?.find((candidate) => candidate.id === reference.id);
      return row ? [{ collectionId: reference.collectionId, id: reference.id, row }] : [];
    });
  }

  private async assertNoChildren({
    table,
    rowKey,
    handled,
  }: {
    table: string;
    rowKey: string;
    handled: Set<string>;
  }) {
    const row = await this.metadata.readRawRow({ table, rowKey });
    for (const key of await this.metadata.referencingForeignKeys({ table })) {
      if (handled.has(key.table) || SET_NULL_ON_DELETE.has(`${key.table}.${key.from}`)) continue;
      const value = row[key.to || "id"];
      if (value == null || value instanceof Uint8Array) continue;
      const counted = await this.metadata.count({
        table: key.table,
        where: sql`${sql.identifier(key.from)} = ${value}`,
      });
      if (counted > 0) {
        throw new BadRequestException(
          `${counted} row(s) in ${key.table} still reference this row. Delete them first so their devices are told too.`,
        );
      }
    }
  }
}
