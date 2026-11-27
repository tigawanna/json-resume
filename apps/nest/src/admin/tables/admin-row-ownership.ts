import { resume, resumeEducation, resumeExperience } from "@repo/db/postgres/schema/resume";
import { eq, getTableColumns } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { DrizzleDB } from "../../database/database.module.js";
import {
  isCollectionId,
  tableForCollection,
  tableNameForCollection,
  type CollectionId,
} from "./admin-table-registry.js";

type Row = Record<string, unknown>;
type Reference = { collectionId: string; field: string };

const ownedViaParent: Partial<Record<CollectionId, { column: string; parent: PgTable }>> = {
  resumeExperienceBullet: { column: "experienceId", parent: resumeExperience },
  resumeEducationBullet: { column: "educationId", parent: resumeEducation },
};

const ownedChildren: Record<string, readonly Reference[]> = {
  resumeExperience: [{ collectionId: "resumeExperienceBullet", field: "experienceId" }],
  resumeEducation: [{ collectionId: "resumeEducationBullet", field: "educationId" }],
};

export const SET_NULL_ON_DELETE = new Set(["resume_skill.group_id"]);
export const NUMERIC_TYPE = /INT|REAL|NUM|DOUBLE|FLOAT|DEC|BOOL/;

export function parentOwnershipFor({ collectionId }: { collectionId: CollectionId }) {
  return ownedViaParent[collectionId];
}

export async function ownerOf({
  db,
  collectionId,
  row,
}: {
  db: DrizzleDB;
  collectionId: CollectionId;
  row: Row;
}): Promise<string> {
  if (typeof row.userId === "string") return row.userId;
  if (typeof row.resumeId === "string") {
    const [owner] = await db
      .select({ userId: resume.userId })
      .from(resume)
      .where(eq(resume.id, row.resumeId))
      .limit(1);
    if (owner) return owner.userId;
  }
  const via = ownedViaParent[collectionId];
  const parentId = via ? row[via.column] : undefined;
  if (typeof parentId === "string") {
    if (collectionId === "resumeExperienceBullet") {
      const [owner] = await db
        .select({ userId: resumeExperience.userId })
        .from(resumeExperience)
        .where(eq(resumeExperience.id, parentId))
        .limit(1);
      if (owner?.userId) return owner.userId;
    } else if (collectionId === "resumeEducationBullet") {
      const [owner] = await db
        .select({ userId: resumeEducation.userId })
        .from(resumeEducation)
        .where(eq(resumeEducation.id, parentId))
        .limit(1);
      if (owner?.userId) return owner.userId;
    }
  }
  throw new Error(`Cannot tell which user owns this ${collectionId} row`);
}

export function ruleCollections({ collectionId }: { collectionId: CollectionId }) {
  const collections = new Set<CollectionId>();
  const visit = ({ id }: { id: string }) => {
    for (const owned of ownedChildren[id] ?? []) {
      if (!isCollectionId(owned.collectionId)) continue;
      if (collections.has(owned.collectionId)) continue;
      collections.add(owned.collectionId);
      visit({ id: owned.collectionId });
    }
  };
  visit({ id: collectionId });
  return collections;
}

export function rowsToDeleteWith({
  collectionId,
  parentId,
  rowsOf,
}: {
  collectionId: string;
  parentId: string;
  rowsOf: ({ collectionId }: { collectionId: string }) => ReadonlyArray<Row>;
}) {
  const rows: Array<{ collectionId: CollectionId; id: string }> = [];
  for (const owned of ownedChildren[collectionId] ?? []) {
    if (!isCollectionId(owned.collectionId)) continue;
    for (const row of rowsOf({ collectionId: owned.collectionId })) {
      if (row[owned.field] !== parentId || typeof row.id !== "string") continue;
      rows.push(
        ...rowsToDeleteWith({
          collectionId: owned.collectionId,
          parentId: row.id,
          rowsOf,
        }),
        { collectionId: owned.collectionId, id: row.id },
      );
    }
  }
  return rows;
}

export async function rowsToDeleteWithFromDb({
  db,
  collectionId,
  parentId,
}: {
  db: DrizzleDB;
  collectionId: CollectionId;
  parentId: string;
}) {
  const rows: Array<{ collectionId: CollectionId; id: string }> = [];
  const seen = new Set<string>();
  const visit = async ({ id, parent }: { id: string; parent: CollectionId }) => {
    for (const owned of ownedChildren[parent] ?? []) {
      const childCollectionId = owned.collectionId;
      if (!isCollectionId(childCollectionId)) continue;
      const table = tableForCollection({ collectionId: childCollectionId });
      const columns: Record<string, PgColumn> = getTableColumns(table);
      const parentColumn = columns[owned.field];
      const idColumn = columns.id;
      if (!parentColumn || !idColumn) continue;
      const children = await db.select({ id: idColumn }).from(table).where(eq(parentColumn, id));
      for (const child of children) {
        const childId = child.id;
        if (typeof childId !== "string") continue;
        const key = JSON.stringify([childCollectionId, childId]);
        if (seen.has(key)) continue;
        seen.add(key);
        await visit({ id: childId, parent: childCollectionId });
        rows.push({ collectionId: childCollectionId, id: childId });
      }
    }
  };
  await visit({ id: parentId, parent: collectionId });
  return rows;
}

export function dependentTables({ collectionId }: { collectionId: CollectionId }) {
  return new Set(
    [...ruleCollections({ collectionId })].map((id) =>
      tableNameForCollection({ collectionId: id }),
    ),
  );
}
