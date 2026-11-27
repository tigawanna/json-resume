import { z } from 'zod';

const decodedRowKeySchema = z.object({
  values: z.array(z.string().min(1).max(2_000)).min(1).max(8),
});

export type AdminRowKeyValue = string | number | bigint;

/** Encode stable primary-key values without relying on Postgres ctid/rowid. */
export function encodeAdminRowKey({
  values,
}: {
  values: readonly AdminRowKeyValue[];
}) {
  if (values.length === 0 || values.length > 8)
    throw new Error('Invalid primary-key value count');
  const normalized = values.map((value) => {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new Error('Unsafe numeric primary key');
    }
    return String(value);
  });
  return Buffer.from(JSON.stringify({ values: normalized }), 'utf8').toString(
    'base64url',
  );
}

export function decodeAdminRowKey({ rowKey }: { rowKey: string }): string[] {
  if (rowKey.length === 0 || rowKey.length > 4_096)
    throw new Error('Invalid row key');
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(rowKey, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid row key');
  }
  const result = decodedRowKeySchema.safeParse(parsed);
  if (!result.success) throw new Error('Invalid row key');
  return result.data.values;
}

export function encodeAdminRowKeyFromRow({
  row,
  columns,
}: {
  row: Record<string, unknown>;
  columns: readonly string[];
}) {
  return encodeAdminRowKey({
    values: columns.map((column) => {
      const value = row[column];
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'bigint'
      ) {
        return value;
      }
      if (value instanceof Date) return value.toISOString();
      throw new Error(`Missing or unsupported primary key ${column}`);
    }),
  });
}
