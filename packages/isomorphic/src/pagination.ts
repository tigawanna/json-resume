export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | undefined;
  previousCursor: string | undefined;
}

export const DEFAULT_PAGE_SIZE = 12;
