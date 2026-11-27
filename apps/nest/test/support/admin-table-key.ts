import { encodeAdminRowKeyFromRow } from '../../src/admin/tables/admin-row-key.js';
import type { DrizzleDB } from '../../src/database/database.module.js';

export async function adminTableKeyOf({
  db,
  table,
  id,
}: {
  db: DrizzleDB;
  table: string;
  id: string;
}) {
  const ident = `"${table.replaceAll('"', '""')}"`;
  const result = await db.$client.query({
    text: `select id from ${ident} where id = $1`,
    values: [id],
  });
  const row = result.rows[0];
  if (!row) throw new Error(`Missing row in ${table} for id ${id}`);
  return encodeAdminRowKeyFromRow({ row, columns: ['id'] });
}
