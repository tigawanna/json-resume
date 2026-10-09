/** Lowercased, whitespace-split search words; every one must match some field. */
export function searchTerms(keyword: string | undefined): string[] {
  return (keyword ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

export function nextOffset(total: number, offset: number, returned: number): number | null {
  const next = offset + returned;
  return next < total ? next : null;
}
