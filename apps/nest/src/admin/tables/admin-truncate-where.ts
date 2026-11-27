import { BadRequestException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { AdminColumn } from "./admin-tables.dto.js";
import type { TruncateCutoff } from "./admin-truncate.types.js";

const DATE_COLUMN = /(_at|_date|date|time|timestamp)$/i;

export function cutoffColumnsOf({ columns }: { columns: AdminColumn[] }) {
  return columns
    .filter((column) => DATE_COLUMN.test(column.name) || /DATE|TIME/.test(column.type))
    .map((column) => column.name);
}

export function whereFor({
  table,
  columns,
  cutoff,
}: {
  table: string;
  columns: AdminColumn[];
  cutoff?: TruncateCutoff;
}) {
  if (!cutoff) return sql`true`;
  const column = columns.find((candidate) => candidate.name === cutoff.column);
  if (!column || !cutoffColumnsOf({ columns }).includes(cutoff.column)) {
    throw new BadRequestException(`"${cutoff.column}" is not a date column of ${table}`);
  }
  const before = new Date(cutoff.before);
  if (/TIMESTAMP|DATE/.test(column.type) && !/INTEGER|NUMERIC/.test(column.type)) {
    return sql`${sql.identifier(column.name)} < ${before}`;
  }
  if (/INTEGER|NUMERIC/.test(column.type)) {
    return sql`to_timestamp(${sql.identifier(column.name)} / 1000.0) < ${before}`;
  }
  return sql`(${sql.identifier(column.name)}::timestamptz) < ${before}`;
}
