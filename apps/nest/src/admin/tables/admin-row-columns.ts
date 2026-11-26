import type { AdminColumn, AdminRowMode } from './admin-tables.dto.js';
import {
  isSecret,
  type AdminTableMetadataService,
} from './admin-table-metadata.service.js';
import { collectionForTable } from './admin-table-registry.js';

const LOCKED_SYNCED_COLUMNS = new Set(['id', 'user_id']);

export function isEditable({
  mode,
  table,
  column,
  locked,
}: {
  mode: AdminRowMode;
  table: string;
  column: AdminColumn;
  locked: Set<string>;
}) {
  if (
    mode === 'readonly' ||
    column.name === 'updated_at' ||
    column.primaryKey ||
    isSecret({ table, column: column.name })
  )
    return false;
  if (column.type.includes('BLOB')) return false;
  return !locked.has(column.name);
}

export async function lockedColumnsFor({
  metadata,
  mode,
  table,
}: {
  metadata: AdminTableMetadataService;
  mode: AdminRowMode;
  table: string;
}) {
  if (mode !== 'synced' || !collectionForTable({ table }))
    return new Set<string>();
  const keys = await metadata.foreignKeys({ table });
  return new Set([...LOCKED_SYNCED_COLUMNS, ...keys.map((key) => key.from)]);
}
