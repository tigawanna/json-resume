export function newestByKey<T extends { id: string; updatedAt: Date }>({
  rows,
  key,
}: {
  rows: ReadonlyArray<T>;
  key: (row: T) => string;
}): T[] {
  const grouped = new Map<string, T>();
  for (const row of rows) {
    const identity = key(row);
    const current = grouped.get(identity);
    if (!current || row.updatedAt > current.updatedAt)
      grouped.set(identity, row);
  }
  return [...grouped.values()];
}
