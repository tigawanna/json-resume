import {
  resume,
  resumeEducation,
  resumeExperience,
} from '@repo/db/schema/resume';
import {
  and,
  eq,
  getTableColumns,
  inArray,
  isNull,
  or,
  type SQL,
} from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { DrizzleDB } from '../../database/database.module.js';
import {
  isCollectionId,
  tableForCollection,
  tableNameForCollection,
  type CollectionId,
} from './admin-table-registry.js';

type Row = Record<string, unknown>;
type Reference = { collectionId: string; field: string };

const ownedViaParent: Partial<
  Record<CollectionId, { column: string; parent: SQLiteTable }>
> = {
  resumeExperienceBullet: { column: 'experienceId', parent: resumeExperience },
  resumeEducationBullet: { column: 'educationId', parent: resumeEducation },
};

const ownedChildren: Record<string, readonly Reference[]> = {
  resumeExperience: [
    { collectionId: 'resumeExperienceBullet', field: 'experienceId' },
  ],
  resumeEducation: [
    { collectionId: 'resumeEducationBullet', field: 'educationId' },
  ],
};

export const SET_NULL_ON_DELETE = new Set(['resume_skill.group_id']);
export const NUMERIC_TYPE = /INT|REAL|NUM|DOUBLE|FLOAT|DEC|BOOL/;

export function ownerFilter({
  db,
  collectionId,
  userId,
}: {
  db: DrizzleDB;
  collectionId: CollectionId;
  userId: string;
}): SQL {
  const columns: Record<string, SQLiteColumn> = getTableColumns(
    tableForCollection({ collectionId }),
  );
  const via = ownedViaParent[collectionId];
  const viaColumn = via ? columns[via.column] : undefined;
  let viaParent: SQL | null = null;
  if (via && viaColumn) {
    const parentColumns: Record<string, SQLiteColumn> = getTableColumns(
      via.parent,
    );
    if (parentColumns.id && parentColumns.userId) {
      viaParent = inArray(
        viaColumn,
        db
          .select({ id: parentColumns.id })
          .from(via.parent)
          .where(eq(parentColumns.userId, userId)),
      );
    }
  }
  if (columns.userId) {
    const direct = eq(columns.userId, userId);
    return viaParent
      ? (or(direct, and(isNull(columns.userId), viaParent)) ?? direct)
      : direct;
  }
  if (columns.resumeId) {
    return inArray(
      columns.resumeId,
      db
        .select({ id: resume.id })
        .from(resume)
        .where(eq(resume.userId, userId)),
    );
  }
  if (viaParent) return viaParent;
  throw new Error(`No ownership path for ${collectionId}`);
}

export function parentOwnershipFor({
  collectionId,
}: {
  collectionId: CollectionId;
}) {
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
  if (typeof row.userId === 'string') return row.userId;
  if (typeof row.resumeId === 'string') {
    const [owner] = await db
      .select({ userId: resume.userId })
      .from(resume)
      .where(eq(resume.id, row.resumeId))
      .limit(1);
    if (owner) return owner.userId;
  }
  const via = ownedViaParent[collectionId];
  const parentId = via ? row[via.column] : undefined;
  if (typeof parentId === 'string') {
    if (collectionId === 'resumeExperienceBullet') {
      const [owner] = await db
        .select({ userId: resumeExperience.userId })
        .from(resumeExperience)
        .where(eq(resumeExperience.id, parentId))
        .limit(1);
      if (owner?.userId) return owner.userId;
    } else if (collectionId === 'resumeEducationBullet') {
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

export function ruleCollections({
  collectionId,
}: {
  collectionId: CollectionId;
}) {
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
      if (row[owned.field] !== parentId || typeof row.id !== 'string') continue;
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

export function dependentTables({
  collectionId,
}: {
  collectionId: CollectionId;
}) {
  return new Set(
    [...ruleCollections({ collectionId })].map((id) =>
      tableNameForCollection({ collectionId: id }),
    ),
  );
}
