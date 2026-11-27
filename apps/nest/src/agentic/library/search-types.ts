import type { LibraryHitBase } from '@repo/isomorphic/agentic/library-view';
import type { DrizzleDB } from '../../database/database.module.js';
import { notInArray, or, sql, type AnyColumn, type SQL } from 'drizzle-orm';

export type PageRequest = {
  terms: ReadonlyArray<string>;
  excludeIds: ReadonlyArray<string>;
  offset: number;
  limit: number;
};

export type SectionResult = { items: LibraryHitBase[]; total: number };

export type SearchContext = {
  db: DrizzleDB;
  userId: string;
  request: PageRequest;
};

export function termFilters(
  terms: ReadonlyArray<string>,
  columns: ReadonlyArray<AnyColumn>,
): SQL[] {
  return terms.map((term) => {
    const match = or(
      ...columns.map(
        (column) => sql`cast(${column} as text) ilike ${`%${term}%`}`,
      ),
    );
    return match ?? sql`false`;
  });
}

export function excluded(
  id: AnyColumn,
  excludeIds: ReadonlyArray<string>,
): SQL | undefined {
  return excludeIds.length > 0 ? notInArray(id, [...excludeIds]) : undefined;
}
