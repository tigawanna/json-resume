import { Inject, Injectable } from "@nestjs/common";
import { resume } from "@repo/db/postgres/schema/resume/index";
import { and, eq, getTableColumns, inArray, isNull, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { DRIZZLE, type DrizzleDB } from "../../database/database.module.js";
import {
  isCollectionId,
  tableForCollection,
  tablesByCollection,
  type CollectionId,
} from "../tables/admin-table-registry.js";

type Row = Record<string, unknown>;

@Injectable()
export class EventLogRebuildRows {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async loadRows({ userId }: { userId: string }) {
    const rowsByCollection = new Map<CollectionId, Row[]>();
    for (const collectionId of Object.keys(tablesByCollection)) {
      if (!isCollectionId(collectionId)) continue;
      const table = tableForCollection({ collectionId });
      const rows = await this.db
        .select()
        .from(table)
        .where(this.ownerFilter({ collectionId, userId }));
      rowsByCollection.set(collectionId, rows);
    }
    return rowsByCollection;
  }

  private ownerFilter({
    collectionId,
    userId,
  }: {
    collectionId: CollectionId;
    userId: string;
  }): SQL {
    const columns: Record<string, PgColumn> = getTableColumns(tableForCollection({ collectionId }));
    const viaParent = this.viaParentFilter({ columns, collectionId, userId });
    if (columns.userId) {
      if (!viaParent) return eq(columns.userId, userId);
      return (
        or(eq(columns.userId, userId), and(isNull(columns.userId), viaParent)) ??
        eq(columns.userId, userId)
      );
    }
    if (columns.resumeId)
      return inArray(
        columns.resumeId,
        this.db.select({ id: resume.id }).from(resume).where(eq(resume.userId, userId)),
      );
    if (viaParent) return viaParent;
    throw new Error(`No ownership path for ${collectionId}`);
  }

  private viaParentFilter({
    columns,
    collectionId,
    userId,
  }: {
    columns: Record<string, PgColumn>;
    collectionId: CollectionId;
    userId: string;
  }): SQL | undefined {
    const parent = parentOf({ collectionId });
    const viaColumn = parent ? columns[parent.column] : undefined;
    if (!parent || !viaColumn) return undefined;
    const parentColumns: Record<string, PgColumn> = getTableColumns(parent.table);
    if (!parentColumns.id || !parentColumns.userId) return undefined;
    return inArray(
      viaColumn,
      this.db
        .select({ id: parentColumns.id })
        .from(parent.table)
        .where(eq(parentColumns.userId, userId)),
    );
  }
}

function parentOf({ collectionId }: { collectionId: CollectionId }) {
  if (collectionId === "resumeExperienceBullet")
    return {
      column: "experienceId",
      table: tablesByCollection.resumeExperience,
    };
  if (collectionId === "resumeEducationBullet")
    return { column: "educationId", table: tablesByCollection.resumeEducation };
  return undefined;
}
