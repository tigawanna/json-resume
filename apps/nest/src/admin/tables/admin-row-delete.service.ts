import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import {
  AdminAuditService,
  type AdminActor,
} from '../audit/admin-audit.service.js';
import {
  quoteIdent,
  AdminTableMetadataService,
} from './admin-table-metadata.service.js';
import { appendAdminEvent } from './admin-row-events.js';
import {
  dependentTables,
  ownerFilter,
  ruleCollections,
  rowsToDeleteWith,
  SET_NULL_ON_DELETE,
} from './admin-row-ownership.js';
import {
  isCollectionId,
  tableForCollection,
  type CollectionId,
} from './admin-table-registry.js';
import { resolveSyncedTarget } from './admin-row-target.js';
import { rowModeFor } from './admin-table-registry.js';

type Row = Record<string, unknown>;
type Dependent = { collectionId: CollectionId; id: string; row: Row };

@Injectable()
export class AdminRowDeleteService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly metadata: AdminTableMetadataService,
    private readonly audit: AdminAuditService,
  ) {}

  remove({
    actor,
    table,
    rowid,
  }: {
    actor: AdminActor;
    table: string;
    rowid: number;
  }) {
    return this.audit.run({
      action: 'delete-row',
      actor,
      input: { table, rowid },
      execute: () => this.removeRow({ table, rowid }),
    });
  }

  private async removeRow({ table, rowid }: { table: string; rowid: number }) {
    const name = await this.metadata.requireTable({ table });
    const mode = rowModeFor({ table: name });
    if (mode === 'readonly')
      throw new BadRequestException(`${name} is read-only`);
    const target =
      mode === 'synced'
        ? await resolveSyncedTarget({
            db: this.db,
            metadata: this.metadata,
            table: name,
            rowid,
          })
        : null;
    const dependents = target
      ? await this.dependentsOf({
          collectionId: target.collectionId,
          userId: target.userId,
          parentId: target.id,
        })
      : [];
    if (target)
      await this.assertNoChildren({
        table: name,
        rowid,
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
            .delete(
              tableForCollection({ collectionId: dependent.collectionId }),
            )
            .where(eq(columns.id, dependent.id));
          await appendAdminEvent({
            tx,
            collectionId: dependent.collectionId,
            userId: target.userId,
            type: 'delete',
            row: dependent.row,
          });
        }
      }
      const result = await tx.run(sqlDelete({ table: name, rowid }));
      if (result.rowsAffected === 0)
        throw new NotFoundException(`Row ${rowid} no longer exists in ${name}`);
      if (target)
        await appendAdminEvent({
          tx,
          ...target,
          type: 'delete',
          row: target.row,
        });
    });
    return { mode, deletedReferences: dependents.length };
  }

  private async dependentsOf({
    collectionId,
    userId,
    parentId,
  }: {
    collectionId: CollectionId;
    userId: string;
    parentId: string;
  }): Promise<Dependent[]> {
    const loaded = new Map<CollectionId, Row[]>();
    for (const childId of ruleCollections({ collectionId })) {
      const rows = await this.db
        .select()
        .from(tableForCollection({ collectionId: childId }))
        .where(ownerFilter({ db: this.db, collectionId: childId, userId }));
      loaded.set(childId, rows);
    }
    const rowsOf = ({ collectionId: id }: { collectionId: string }) => {
      if (!isCollectionId(id)) return [];
      return loaded.get(id) ?? [];
    };
    return rowsToDeleteWith({ collectionId, parentId, rowsOf }).flatMap(
      (dependent) => {
        const row = loaded
          .get(dependent.collectionId)
          ?.find((candidate) => candidate.id === dependent.id);
        return row
          ? [{ collectionId: dependent.collectionId, id: dependent.id, row }]
          : [];
      },
    );
  }

  private async assertNoChildren({
    table,
    rowid,
    handled,
  }: {
    table: string;
    rowid: number;
    handled: Set<string>;
  }) {
    const row = await this.metadata.readRawRow({ table, rowid });
    for (const key of await this.metadata.referencingForeignKeys({ table })) {
      if (
        handled.has(key.table) ||
        SET_NULL_ON_DELETE.has(`${key.table}.${key.from}`)
      )
        continue;
      const value = row[key.to || 'id'];
      if (value == null || value instanceof ArrayBuffer) continue;
      const counted = await this.metadata.count({
        table: key.table,
        where: `${quoteIdent({ name: key.from })} = ?`,
        args: [value],
      });
      if (counted > 0) {
        throw new BadRequestException(
          `${counted} row(s) in ${key.table} still reference this row. Delete them first so their devices are told too.`,
        );
      }
    }
  }
}

function sqlDelete({ table, rowid }: { table: string; rowid: number }) {
  return sql`delete from ${sql.raw(quoteIdent({ name: table }))} where rowid = ${rowid}`;
}
