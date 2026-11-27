import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../database/database.module.js";
import { encodeAdminRowKeyFromRow } from "./admin-row-key.js";
import { escapeLike, toCell } from "./admin-table-metadata-helpers.js";
import { AdminTableMetadataService } from "./admin-table-metadata.service.js";

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
    const name = await this.metadata.requireTable({ table });
    const [columns, primaryKeys] = await Promise.all([
      this.metadata.columns({ table: name }),
      this.metadata.primaryKeyColumns({ table: name }),
    ]);
    const query = q?.trim();
    const condition =
      query && columns.length > 0
        ? sql.join(
            columns.map(
              (column) =>
                sql`cast(${sql.identifier(column.name)} as text) like ${`%${escapeLike({ value: query })}%`} escape '\\'`,
            ),
            sql` or `,
          )
        : undefined;
    const orderColumns =
      primaryKeys.length > 0 ? primaryKeys : columns.slice(0, 1).map(({ name }) => name);
    const order = sql.join(
      orderColumns.map((column) => sql`${sql.identifier(column)} desc`),
      sql`, `,
    );
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
          cells[column.name] = toCell({
            table: name,
            column: column.name,
            value: row[column.name],
          });
        }
        return { rowKey: encodeAdminRowKeyFromRow({ row, columns: primaryKeys }), cells };
      }),
    };
  }
}
