import type { DrizzleDB } from '../../src/database/database.module.js';

export async function adminTableRowidOf({
  db,
  table,
  id,
}: {
  db: DrizzleDB;
  table: string;
  id: string;
}) {
  const ident = `"${table.replaceAll('"', '""')}"`;
  const result = await db.$client.execute({
    sql: `select rowid from ${ident} where id = ?`,
    args: [id],
  });
  return Number(result.rows[0]?.rowid);
}
