import type { AnyColumn, SQL } from 'drizzle-orm';
import { and, eq, gt, lt, or } from 'drizzle-orm';

export type ExperienceCursor = { sortOrder: number; id: string };

export function parseExperienceCursor(
  cursor?: string,
): ExperienceCursor | undefined {
  if (!cursor) return undefined;
  const separator = cursor.indexOf(':');
  if (separator < 0) return undefined;
  const sortOrder = Number(cursor.slice(0, separator));
  const id = cursor.slice(separator + 1);
  if (!Number.isFinite(sortOrder) || id.length === 0) return undefined;
  return { sortOrder, id };
}

export function experienceCursorCondition({
  sortOrderColumn,
  idColumn,
  cursor,
  direction,
}: {
  sortOrderColumn: AnyColumn;
  idColumn: AnyColumn;
  cursor?: ExperienceCursor;
  direction: 'after' | 'before';
}): SQL | undefined {
  if (!cursor) return undefined;
  if (direction === 'before') {
    return or(
      gt(sortOrderColumn, cursor.sortOrder),
      and(eq(sortOrderColumn, cursor.sortOrder), gt(idColumn, cursor.id)),
    );
  }
  return or(
    lt(sortOrderColumn, cursor.sortOrder),
    and(eq(sortOrderColumn, cursor.sortOrder), lt(idColumn, cursor.id)),
  );
}
