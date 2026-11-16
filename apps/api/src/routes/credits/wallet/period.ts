/** UTC period helpers for the monthly credit bucket. */

/** `YYYY-MM` in UTC — the monthly period key. */
export function periodKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** First instant of the next UTC month: when the monthly bucket resets. */
export function nextResetAt(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}
