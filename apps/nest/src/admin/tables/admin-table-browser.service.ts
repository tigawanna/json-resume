import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import { encodeAdminRowKeyFromRow } from './admin-row-key.js';
import { escapeLike, toCell } from './admin-table-metadata-helpers.js';
import { AdminTableMetadataService } from './admin-table-metadata.service.js';

@Injectable()
export class AdminTableBrowserService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly metadata: AdminTableMetadataService,
  ) {}

  list() {
    return this.metadata.tables();
  }

  async page({
    table,
    page,
    pageSize,
    q,
  }: {
    table: string;
    page: number;
    pageSize: number;
    q?: string;
  }) {
    // Reject unknown tables; `name` is the quoted-safe identifier we actually query.
    const name = await this.metadata.requireTable({ table });
    const [columns, primaryKeys] = await Promise.all([
      this.metadata.columns({ table: name }),
      this.metadata.primaryKeyColumns({ table: name }),
    ]);
    const query = q?.trim();
    // One OR per column: cast everything to text so ints/dates/uuids match the same grep.
    // `escapeLike` + `escape '\'` keep user `%` `_` `\` as literals, not LIKE wildcards.
    const condition =
      query && columns.length > 0
        ? sql.join(
            columns.map(
              (column) =>
                sql`cast(${sql.identifier(column.name)} as text) ilike ${`%${escapeLike({ value: query })}%`} escape '\\'`,
            ),
            sql` or `,
          )
        : undefined;
    // Stable paging: PK desc, or the first column when the table has no PK.
    const orderColumns =
      primaryKeys.length > 0
        ? primaryKeys
        : columns.slice(0, 1).map(({ name }) => name);
    const order = sql.join(
      orderColumns.map((column) => sql`${sql.identifier(column)} desc`),
      sql`, `,
    );
    // Same WHERE for total (pager) and the page of rows; offset is `page * pageSize`.
    const [total, rows] = await Promise.all([
      this.metadata.count({ table: name, where: condition }),
      this.db.execute(sql`
        select * from ${sql.identifier(name)}
        ${condition ? sql`where ${condition}` : sql``}
        order by ${order}
        limit ${pageSize} offset ${page * pageSize}
      `),
    ]);
    return {
      table: name,
      total,
      page,
      pageSize,
      columns,
      rows: rows.rows.map((row) => {
        const cells: Record<string, ReturnType<typeof toCell>> = {};
        for (const column of columns) {
          // Display-safe cells: secrets masked, binary/bigint/dates normalized, long text truncated.
          cells[column.name] = toCell({
            table: name,
            column: column.name,
            value: row[column.name],
          });
        }
        // Opaque key from PK values so later get/update/delete can target this row.
        return {
          rowKey: encodeAdminRowKeyFromRow({ row, columns: primaryKeys }),
          cells,
        };
      }),
    };
  }
}
