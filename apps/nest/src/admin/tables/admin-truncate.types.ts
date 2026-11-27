import type { SQL } from "drizzle-orm";
import type { AdminRowMode } from "./admin-tables.dto.js";
import type { CollectionId } from "./admin-table-registry.js";

export type TruncateCutoff = { column: string; before: number };
export type TruncateMode = AdminRowMode | "eventLog";
export type DeleteTarget = {
  collectionId: CollectionId;
  row: Record<string, unknown>;
  userId: string | null;
};
export type TruncatePlan = {
  table: string;
  mode: TruncateMode;
  backups: Array<{ table: string; rows: number; createdAt: number }>;
  cutoffColumns: string[];
  rows: number;
  references: Array<{ table: string; rows: number }>;
  blockedBy: Array<{ table: string; column: string; rows: number }>;
  cascades: Array<{ table: string; column: string; rows: number }>;
  targets: DeleteTarget[];
  where: SQL;
};
