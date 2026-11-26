import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InValue } from '@libsql/client';
import { sql, type SQL } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import {
  AdminAuditService,
  type AdminActor,
} from '../audit/admin-audit.service.js';
import type { AdminColumn } from './admin-tables.dto.js';
import {
  quoteIdent,
  AdminTableMetadataService,
} from './admin-table-metadata.service.js';
import { NUMERIC_TYPE } from './admin-row-ownership.js';
import { rowModeFor } from './admin-table-registry.js';
import { appendAdminEvent, readSyncedRow } from './admin-row-events.js';
import { resolveSyncedTarget } from './admin-row-target.js';
import { isEditable, lockedColumnsFor } from './admin-row-columns.js';

function toSqlValue({
  column,
  value,
}: {
  column: AdminColumn;
  value: string | null;
}): InValue {
  if (value === null) return null;
  if (!NUMERIC_TYPE.test(column.type)) return value;
  const trimmed = value.trim();
  if (trimmed === '' || !Number.isFinite(Number(trimmed))) {
    throw new BadRequestException(`Column "${column.name}" needs a number`);
  }
  return Number(trimmed);
}

@Injectable()
export class AdminRowService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly metadata: AdminTableMetadataService,
    private readonly audit: AdminAuditService,
  ) {}

  update({
    actor,
    ...input
  }: {
    actor: AdminActor;
    table: string;
    rowid: number;
    values: Record<string, string | null>;
  }) {
    return this.audit.run({
      action: 'update-row',
      actor,
      input: {
        table: input.table,
        rowid: input.rowid,
        columns: Object.keys(input.values),
      },
      execute: () => this.updateRow(input),
    });
  }

  private async updateRow({
    table,
    rowid,
    values,
  }: {
    table: string;
    rowid: number;
    values: Record<string, string | null>;
  }) {
    const name = await this.metadata.requireTable({ table });
    const mode = rowModeFor({ table: name });
    if (mode === 'readonly')
      throw new BadRequestException(`${name} is read-only`);
    const [columns, locked] = await Promise.all([
      this.metadata.columns({ table: name }),
      lockedColumnsFor({ metadata: this.metadata, mode, table: name }),
    ]);
    const assignments: SQL[] = [];
    for (const [columnName, value] of Object.entries(values)) {
      const column = columns.find((candidate) => candidate.name === columnName);
      if (!column || !isEditable({ mode, table: name, column, locked })) {
        throw new BadRequestException(
          `Column "${columnName}" cannot be edited`,
        );
      }
      if (value === null && column.notNull) {
        throw new BadRequestException(`Column "${columnName}" cannot be empty`);
      }
      assignments.push(
        sql`${sql.raw(quoteIdent({ name: columnName }))} = ${toSqlValue({ column, value })}`,
      );
    }
    if (assignments.length === 0) return { mode, changed: 0 };
    const updatedAt = columns.find((column) => column.name === 'updated_at');
    if (updatedAt && !('updated_at' in values)) {
      const stamp = NUMERIC_TYPE.test(updatedAt.type)
        ? Date.now()
        : new Date().toISOString();
      assignments.push(
        sql`${sql.raw(quoteIdent({ name: 'updated_at' }))} = ${stamp}`,
      );
    }
    const target =
      mode === 'synced'
        ? await resolveSyncedTarget({
            db: this.db,
            metadata: this.metadata,
            table: name,
            rowid,
          })
        : null;
    await this.db.transaction(async (tx) => {
      const result = await tx.run(
        sql`update ${sql.raw(quoteIdent({ name }))} set ${sql.join(assignments, sql`, `)} where rowid = ${rowid}`,
      );
      if (result.rowsAffected === 0)
        throw new NotFoundException(`Row ${rowid} no longer exists in ${name}`);
      if (target) {
        const row = await readSyncedRow({
          db: tx,
          collectionId: target.collectionId,
          id: target.id,
        });
        await appendAdminEvent({ tx, ...target, type: 'update', row });
      }
    });
    return { mode, changed: Object.keys(values).length };
  }
}
