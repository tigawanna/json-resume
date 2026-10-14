function errorText(err: unknown): string {
  if (!(err instanceof Error)) return "";
  const cause = err.cause instanceof Error ? err.cause.message : "";
  return `${err.message}\n${cause}`;
}

/** SQL column names from `UNIQUE constraint failed: table.col, table.col`. */
export function uniqueConstraintColumns(err: unknown): string[] | null {
  const match = errorText(err).match(/UNIQUE constraint failed: ([^(\n]+)/);
  const list = match?.[1];
  if (!list) return null;
  const names = list
    .split(",")
    .map((part) => part.trim().split(".").pop() ?? "")
    .filter((name) => name.length > 0);
  return names.length > 0 ? names : null;
}

export function isForeignKeyError(err: unknown): boolean {
  const text = errorText(err);
  return (
    text.includes("FOREIGN KEY constraint failed") || text.includes("SQLITE_CONSTRAINT_FOREIGNKEY")
  );
}
