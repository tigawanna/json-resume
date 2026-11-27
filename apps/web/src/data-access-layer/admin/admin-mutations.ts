import {
  adminTablesControllerDeleteRow,
  adminTablesControllerTruncateTable,
  adminTablesControllerUpdateRow,
} from "@/services/nest/client";

type RowRef = { table: string; rowKey: string };

export function updateAdminRow({
  table,
  rowKey,
  values,
}: RowRef & { values: Record<string, string | null> }) {
  return adminTablesControllerUpdateRow({
    path: { table, rowKey },
    body: { values },
  });
}

export function deleteAdminRow({ table, rowKey }: RowRef) {
  return adminTablesControllerDeleteRow({ path: { table, rowKey } });
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
