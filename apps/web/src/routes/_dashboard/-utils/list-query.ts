import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { and, ilike, inArray, isNull, isUndefined, or } from "@tanstack/db";

type IlikeField = Parameters<typeof ilike>[0];

export function keywordPattern(q: string) {
  return `%${q.trim()}%`;
}

/**
 * Case-insensitive OR across query field refs. Empty `q` must be skipped
 * by the caller — do not call this for an unfiltered list.
 */
export function orIlike(q: string, first: IlikeField, second: IlikeField, ...rest: IlikeField[]) {
  const pattern = keywordPattern(q);
  return or(
    ilike(first, pattern),
    ilike(second, pattern),
    ...rest.map((field) => ilike(field, pattern)),
  );
}

type ExpressionArg = Parameters<typeof inArray>[0];

/**
 * Rows written with one of `resumeIds`, plus rows with no résumé that belong
 * to one of `jobIds` (the picked résumés' target jobs).
 */
export function writtenForResumes(
  resumeId: ExpressionArg,
  jobId: ExpressionArg,
  resumeIds: ReadonlyArray<string>,
  jobIds: ReadonlyArray<string>,
) {
  return or(
    inArray(resumeId, [...resumeIds]),
    and(or(isNull(resumeId), isUndefined(resumeId)), inArray(jobId, [...jobIds])),
  );
}

export function listOffset(page: number, perPage = ADMIN_LIST_PER_PAGE) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  return (safePage - 1) * perPage;
}

export function totalPagesFromCount(totalItems: number, perPage = ADMIN_LIST_PER_PAGE) {
  if (totalItems <= 0) return 0;
  return Math.ceil(totalItems / perPage);
}

export type ListSortDirection = "asc" | "desc";

export function listSortDirection(
  dir: string | undefined,
  fallback: ListSortDirection = "desc",
): ListSortDirection {
  return dir === "asc" || dir === "desc" ? dir : fallback;
}

/**
 * Query-builder field ref for `.orderBy`. Sort in TanStack DB, never in JS.
 */
export function listOrderByRef<T extends object>(
  row: T,
  sortBy: string | undefined,
  fallback: keyof T & string,
) {
  const key = (sortBy ?? fallback) as keyof T;
  const selected = row[key];
  return selected === undefined ? row[fallback] : selected;
}
