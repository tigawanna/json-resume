import {
  adminTablesControllerDeleteRow,
  adminTablesControllerTruncateTable,
  adminTablesControllerUpdateRow,
} from "@/services/nest/client";

type RowRef = { table: string; rowid: number };

export function updateAdminRow({
  table,
  rowid,
  values,
}: RowRef & { values: Record<string, string | null> }) {
  return adminTablesControllerUpdateRow({
    path: { table, rowid },
    body: { values },
  });
}

export function deleteAdminRow({ table, rowid }: RowRef) {
  return adminTablesControllerDeleteRow({ path: { table, rowid } });
}

export function truncateAdminTable({
  table,
  confirm,
  cutoff,
  rebuild,
}: {
  table: string;
  confirm: string;
  cutoff?: { column: string; before: number };
  rebuild?: boolean;
}) {
  return adminTablesControllerTruncateTable({
    path: { table },
    body: { confirm, cutoff, rebuild },
  });
}
