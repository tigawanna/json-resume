import {
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
} from '@repo/isomorphic/pagination';
import type { AnyColumn, SQL } from 'drizzle-orm';
import { gt, ilike, lt, or } from 'drizzle-orm';

export { DEFAULT_PAGE_SIZE };
export type ListDirection = 'after' | 'before';

export function searchCondition({
  keyword,
  columns,
}: {
  keyword?: string;
  columns: ReadonlyArray<AnyColumn>;
}): SQL | undefined {
  if (!keyword) return undefined;
  const pattern = `%${keyword}%`;
  return or(...columns.map((column) => ilike(column, pattern)));
}

export function idCursorCondition({
  column,
  cursor,
  direction,
}: {
  column: AnyColumn;
  cursor?: string;
  direction: ListDirection;
}): SQL | undefined {
  if (!cursor) return undefined;
  return direction === 'before' ? lt(column, cursor) : gt(column, cursor);
}

export function pageRows<T>({
  rows,
  cursor,
  direction,
  getId,
}: {
  rows: ReadonlyArray<T>;
  cursor?: string;
  direction: ListDirection;
  getId: (row: T) => string;
}): PaginatedResult<T> {
  const hasMore = rows.length > DEFAULT_PAGE_SIZE;
  const page = rows.slice(0, DEFAULT_PAGE_SIZE);
  const items = direction === 'before' ? page.reverse() : page;
  const first = items[0];
  const last = items[items.length - 1];

  if (direction === 'after') {
    return {
      items,
      nextCursor: hasMore && last ? getId(last) : undefined,
      previousCursor: cursor !== undefined && first ? getId(first) : undefined,
    };
  }
  return {
    items,
    nextCursor: last ? getId(last) : undefined,
    previousCursor: hasMore && first ? getId(first) : undefined,
  };
}

export async function byIds<T>({
  ids,
  load,
}: {
  ids: ReadonlyArray<string>;
  load: (ids: string[]) => PromiseLike<T[]>;
}): Promise<T[]> {
  return ids.length === 0 ? [] : load([...ids]);
}
