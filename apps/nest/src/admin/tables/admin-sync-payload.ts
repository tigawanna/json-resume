type Row = Record<string, unknown>;

/** Same payload shape as client sync events: epoch timestamps and no embedding blobs. */
export function toPayload({ row }: { row: Row }): Row {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      let payloadValue = value;
      if (key === 'embedding') payloadValue = null;
      else if (value instanceof Date) payloadValue = value.getTime();
      return [key, payloadValue];
    }),
  );
}
