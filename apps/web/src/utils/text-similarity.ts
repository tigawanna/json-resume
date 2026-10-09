/** Lowercase word tokens with punctuation stripped. */
export function wordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .split(" ")
    .filter(Boolean);
}

/** Sørensen–Dice overlap of two token lists, 0 (disjoint) to 1 (same set). */
export function tokenSimilarity(a: ReadonlyArray<string>, b: ReadonlyArray<string>): number {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size === 0 && right.size === 0) return 1;
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared++;
  return (2 * shared) / (left.size + right.size);
}

/** Word-level similarity of two strings, 0 to 1. */
export function textSimilarity(a: string, b: string): number {
  return tokenSimilarity(wordTokens(a), wordTokens(b));
}
