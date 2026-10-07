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
const ROWID_ALIAS = "__admin_rowid";

export function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

function textOf(value: Row[string] | undefined): string {
  if (value == null || value instanceof ArrayBuffer) return "";
  return String(value);
}

/** Escapes `%`, `_` and `\` so user input matches literally in `like ? escape '\'`. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Rows are addressed by `rowid`, so `without rowid` tables are left out. */
async function remoteTableNames(): Promise<string[]> {
  const result = await db.$client.execute(
    "select name, sql from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name",
  );
  return result.rows
    .filter((row) => !/without\s+rowid/i.test(textOf(row.sql)))
    .map((row) => textOf(row.name));
}

export type AdminForeignKey = { table: string; from: string; to: string };

/** Foreign keys declared on `table` (its columns pointing at other tables). */
export async function remoteForeignKeys(table: string): Promise<AdminForeignKey[]> {
  const result = await db.$client.execute(`pragma foreign_key_list(${quoteIdent(table)})`);
  return result.rows.map((row) => ({
    table: textOf(row.table),
    from: textOf(row.from),
    to: textOf(row.to),
  }));
}

/** Foreign keys on other tables that point at `table`. */
export async function referencingForeignKeys(table: string): Promise<AdminForeignKey[]> {
  const names = await remoteTableNames();
  const lists = await Promise.all(
    names.map(async (name) =>
      (await remoteForeignKeys(name))
        .filter((key) => key.table === table)
        .map((key) => ({ ...key, table: name })),
    ),
  );
  return lists.flat();
}

export async function remoteColumns(table: string): Promise<AdminColumn[]> {
  const result = await db.$client.execute(`pragma table_info(${quoteIdent(table)})`);
  return result.rows.map((row) => ({
    name: textOf(row.name),
    type: textOf(row.type).toUpperCase(),
    notNull: Number(row.notnull) === 1,
    primaryKey: Number(row.pk) > 0,
  }));
}

/** Only names that exist remotely ever reach a SQL string. */
export async function requireTable(table: string): Promise<string> {
  const names = await remoteTableNames();
  if (!names.includes(table)) throw new Error(`Unknown table "${table}"`);
  return table;
}

export function isSecret(table: string, column: string): boolean {
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
      .map((column) => `cast(${quoteIdent(column.name)} as text) like ? escape '\\'`)
      .join(" or ")}`;
    for (const _ of columns) args.push(`%${escapeLike(query)}%`);
  }

  const [total, page] = await Promise.all([
    db.$client.execute({ sql: `select count(*) as n from ${from} ${where}`, args }),
    db.$client.execute({
      sql: `select rowid as ${ROWID_ALIAS}, * from ${from} ${where} order by rowid desc limit ? offset ?`,
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
      return { rowid: Number(row[ROWID_ALIAS]), cells };
    }),
  };
}
