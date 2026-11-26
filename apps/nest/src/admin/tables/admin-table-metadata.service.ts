import { NotFoundException, Inject, Injectable } from '@nestjs/common';
import type { InValue, Row as LibsqlRow, Value } from '@libsql/client';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { AdminCell, AdminColumn } from './admin-tables.dto.js';

export type AdminForeignKey = { table: string; from: string; to: string };

const SECRET_COLUMN = /password|token|secret|private_?key/i;
const SECRET_COLUMNS_BY_TABLE: Record<string, readonly string[]> = {
  apikey: ['key'],
  verification: ['value'],
};
const MAX_CELL_CHARS = 1_000;
export const ROWID_ALIAS = '__admin_rowid';

export function quoteIdent({ name }: { name: string }) {
  return `"${name.replaceAll('"', '""')}"`;
}

export function escapeLike({ value }: { value: string }) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function textOf(value: Value | undefined): string {
  if (value == null || value instanceof ArrayBuffer) return '';
  return String(value);
}

export function isSecret({ table, column }: { table: string; column: string }) {
  return (
    SECRET_COLUMN.test(column) ||
    (SECRET_COLUMNS_BY_TABLE[table] ?? []).includes(column)
  );
}

export function toCell({
  table,
  column,
  value,
}: {
  table: string;
  column: string;
  value: Value | undefined;
}): AdminCell {
  if (value == null) return null;
  if (isSecret({ table, column })) return '••••••';
  if (value instanceof ArrayBuffer) return `<binary ${value.byteLength} bytes>`;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return value;
  return value.length > MAX_CELL_CHARS
    ? `${value.slice(0, MAX_CELL_CHARS)}… (${value.length.toLocaleString()} chars)`
    : value;
}

@Injectable()
export class AdminTableMetadataService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async tables() {
    const names = await this.tableNames();
    return Promise.all(
      names.map(async (name) => {
        const [columns, counted] = await Promise.all([
          this.columns({ table: name }),
          this.count({ table: name, where: '1 = 1', args: [] }),
        ]);
        return { name, rowCount: counted, columns };
      }),
    );
  }

  async tableNames() {
    const result = await this.db.$client.execute(
      "select name, sql from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name",
    );
    return result.rows
      .filter((row) => !/without\s+rowid/i.test(textOf(row.sql)))
      .map((row) => textOf(row.name));
  }

  async requireTable({ table }: { table: string }) {
    if (!(await this.tableNames()).includes(table)) {
      throw new NotFoundException(`Unknown table "${table}"`);
    }
    return table;
  }

  async columns({ table }: { table: string }): Promise<AdminColumn[]> {
    const result = await this.db.$client.execute(
      `pragma table_info(${quoteIdent({ name: table })})`,
    );
    return result.rows.map((row) => ({
      name: textOf(row.name),
      type: textOf(row.type).toUpperCase(),
      notNull: Number(row.notnull) === 1,
      primaryKey: Number(row.pk) > 0,
    }));
  }

  async foreignKeys({ table }: { table: string }): Promise<AdminForeignKey[]> {
    const result = await this.db.$client.execute(
      `pragma foreign_key_list(${quoteIdent({ name: table })})`,
    );
    return result.rows.map((row) => ({
      table: textOf(row.table),
      from: textOf(row.from),
      to: textOf(row.to),
    }));
  }

  async referencingForeignKeys({ table }: { table: string }) {
    const names = await this.tableNames();
    const lists = await Promise.all(
      names.map(async (name) =>
        (await this.foreignKeys({ table: name }))
          .filter((key) => key.table === table)
          .map((key) => ({ ...key, table: name })),
      ),
    );
    return lists.flat();
  }

  async readRawRow({
    table,
    rowid,
  }: {
    table: string;
    rowid: number;
  }): Promise<LibsqlRow> {
    const result = await this.db.$client.execute({
      sql: `select * from ${quoteIdent({ name: table })} where rowid = ?`,
      args: [rowid],
    });
    const row = result.rows[0];
    if (!row)
      throw new NotFoundException(`Row ${rowid} no longer exists in ${table}`);
    return row;
  }

  async count({
    table,
    where,
    args,
  }: {
    table: string;
    where: string;
    args: InValue[];
  }) {
    const result = await this.db.$client.execute({
      sql: `select count(*) as n from ${quoteIdent({ name: table })} where ${where}`,
      args,
    });
    return Number(result.rows[0]?.n ?? 0);
  }
}
