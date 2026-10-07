import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import type { InValue, Row } from "@libsql/client";

export type AdminCell = string | number | boolean | null;

export type AdminColumn = {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
};

const SECRET_COLUMN = /password|token|secret|private_?key/i;
const SECRET_COLUMNS_BY_TABLE: Record<string, string[]> = {
  apikey: ["key"],
  verification: ["value"],
};
const MAX_CELL_CHARS = 1_000;

function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

function textOf(value: Row[string] | undefined): string {
  if (value == null || value instanceof ArrayBuffer) return "";
  return String(value);
}

async function remoteTableNames(): Promise<string[]> {
  const result = await db.$client.execute(
    "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name",
  );
  return result.rows.map((row) => textOf(row.name));
}

async function remoteColumns(table: string): Promise<AdminColumn[]> {
  const result = await db.$client.execute(`pragma table_info(${quoteIdent(table)})`);
  return result.rows.map((row) => ({
    name: textOf(row.name),
    type: textOf(row.type).toUpperCase(),
    notNull: Number(row.notnull) === 1,
    primaryKey: Number(row.pk) > 0,
  }));
}

/** Only names that exist remotely ever reach a SQL string. */
async function requireTable(table: string): Promise<string> {
  const names = await remoteTableNames();
  if (!names.includes(table)) throw new Error(`Unknown table "${table}"`);
  return table;
}

function isSecret(table: string, column: string): boolean {
  return SECRET_COLUMN.test(column) || (SECRET_COLUMNS_BY_TABLE[table] ?? []).includes(column);
}

function toCell(table: string, column: string, value: Row[string] | undefined): AdminCell {
  if (value == null) return null;
  if (isSecret(table, column)) return "••••••";
  if (value instanceof ArrayBuffer) return `<binary ${value.byteLength} bytes>`;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return value;
  return value.length > MAX_CELL_CHARS
    ? `${value.slice(0, MAX_CELL_CHARS)}… (${value.length.toLocaleString()} chars)`
    : value;
}

export async function listAdminTables() {
  const names = await remoteTableNames();
  return Promise.all(
    names.map(async (name) => {
      const [columns, counted] = await Promise.all([
        remoteColumns(name),
        db.$client.execute(`select count(*) as n from ${quoteIdent(name)}`),
      ]);
      return { name, rowCount: Number(counted.rows[0]?.n ?? 0), columns };
    }),
  );
}

export type AdminTablePageInput = {
  table: string;
  page: number;
  pageSize: number;
  q?: string;
};

export async function readAdminTablePage(input: AdminTablePageInput) {
  const table = await requireTable(input.table);
  const columns = await remoteColumns(table);
  const from = quoteIdent(table);

  const query = input.q?.trim();
  const args: InValue[] = [];
  let where = "";
  if (query && columns.length > 0) {
    where = `where ${columns
      .map((column) => `cast(${quoteIdent(column.name)} as text) like ?`)
      .join(" or ")}`;
    for (const _ of columns) args.push(`%${query}%`);
  }

  const [total, page] = await Promise.all([
    db.$client.execute({ sql: `select count(*) as n from ${from} ${where}`, args }),
    db.$client.execute({
      sql: `select * from ${from} ${where} order by rowid desc limit ? offset ?`,
      args: [...args, input.pageSize, input.page * input.pageSize],
    }),
  ]);

  return {
    table,
    total: Number(total.rows[0]?.n ?? 0),
    page: input.page,
    pageSize: input.pageSize,
    columns,
    rows: page.rows.map((row) => {
      const cells: Record<string, AdminCell> = {};
      for (const column of columns) {
        cells[column.name] = toCell(table, column.name, row[column.name]);
      }
      return cells;
    }),
  };
}
