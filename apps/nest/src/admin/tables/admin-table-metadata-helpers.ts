import type { AdminCell } from './admin-tables.dto.js';

export type AdminForeignKey = { table: string; from: string; to: string };

const SECRET_COLUMN = /password|token|secret|private_?key/i;
const SECRET_COLUMNS_BY_TABLE: Record<string, readonly string[]> = {
  apikey: ['key'],
  verification: ['value'],
};
const MAX_CELL_CHARS = 1_000;

export function quoteIdent({ name }: { name: string }) {
  return `"${name.replaceAll('"', '""')}"`;
}

export function escapeLike({ value }: { value: string }) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
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
  value: unknown;
}): AdminCell {
  if (value == null) return null;
  if (isSecret({ table, column })) return '••••••';
  if (value instanceof Uint8Array) return `<binary ${value.byteLength} bytes>`;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_CELL_CHARS
    ? `${text.slice(0, MAX_CELL_CHARS)}… (${text.length.toLocaleString()} chars)`
    : text;
}
