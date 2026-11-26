import { BadRequestException } from '@nestjs/common';
import type { InValue } from '@libsql/client';
import type { AdminColumn } from './admin-tables.dto.js';
import { quoteIdent } from './admin-table-metadata.service.js';
import type { TruncateCutoff } from './admin-truncate.types.js';

const SECONDS_EPOCH_LIMIT = 100_000_000_000;
const DATE_COLUMN = /(_at|_date|date|time|timestamp)$/i;

export function cutoffColumnsOf({ columns }: { columns: AdminColumn[] }) {
  return columns
    .filter(
      (column) =>
        DATE_COLUMN.test(column.name) || /DATE|TIME/.test(column.type),
    )
    .map((column) => column.name);
}

/** Stored dates may be epoch seconds, epoch milliseconds or SQLite date text. */
export function whereFor({
  table,
  columns,
  cutoff,
}: {
  table: string;
  columns: AdminColumn[];
  cutoff?: TruncateCutoff;
}): { sql: string; args: InValue[] } {
  if (!cutoff) return { sql: '1 = 1', args: [] };
  if (!cutoffColumnsOf({ columns }).includes(cutoff.column)) {
    throw new BadRequestException(
      `"${cutoff.column}" is not a date column of ${table}`,
    );
  }
  const ident = quoteIdent({ name: cutoff.column });
  const asMs = `case
    when typeof(${ident}) in ('integer', 'real') and ${ident} < ${SECONDS_EPOCH_LIMIT} then ${ident} * 1000
    when typeof(${ident}) in ('integer', 'real') then ${ident}
    else (julianday(${ident}) - 2440587.5) * 86400000
  end`;
  return { sql: `(${asMs}) < ?`, args: [cutoff.before] };
}
