export function periodKeyOf({ date }: { date: Date }) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

/** First instant of the next UTC month, when monthly credits reset. */
export function nextResetAt({ date }: { date: Date }) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}
