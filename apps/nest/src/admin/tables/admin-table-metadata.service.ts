import { NotFoundException, Inject, Injectable } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../database/database.module.js";
import type { AdminColumn } from "./admin-tables.dto.js";
import { decodeAdminRowKey } from "./admin-row-key.js";
import type { AdminForeignKey } from "./admin-table-metadata-helpers.js";

export { escapeLike, isSecret, quoteIdent, toCell } from "./admin-table-metadata-helpers.js";
export type { AdminForeignKey } from "./admin-table-metadata-helpers.js";

type Row = Record<string, unknown>;

@Injectable()
export class AdminTableMetadataService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async tables() {
    const names = await this.tableNames();
    return Promise.all(
      names.map(async (name) => {
        const [columns, counted] = await Promise.all([
          this.columns({ table: name }),
          this.count({ table: name }),
        ]);
        return { name, rowCount: counted, columns };
      }),
    );
  }

  async tableNames() {
    const result = await this.db.execute(sql`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
        and table_name not like '\\_%' escape '\\'
      order by table_name
    `);
    return result.rows.map((row) => String(row.table_name));
  }

  async requireTable({ table }: { table: string }) {
    if (!(await this.tableNames()).includes(table)) {
      throw new NotFoundException(`Unknown table "${table}"`);
    }
    return table;
  }

  async columns({ table }: { table: string }): Promise<AdminColumn[]> {
    const result = await this.db.execute(sql`
      select c.column_name, c.data_type, c.is_nullable,
        exists (
          select 1 from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on kcu.constraint_name = tc.constraint_name
           and kcu.table_schema = tc.table_schema
          where tc.table_schema = 'public' and tc.table_name = ${table}
            and tc.constraint_type = 'PRIMARY KEY' and kcu.column_name = c.column_name
        ) as primary_key
      from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = ${table}
      order by c.ordinal_position
    `);
    return result.rows.map((row) => ({
      name: String(row.column_name),
      type: String(row.data_type).toUpperCase(),
      notNull: row.is_nullable === "NO",
      primaryKey: row.primary_key === true,
    }));
  }

  async primaryKeyColumns({ table }: { table: string }) {
    const result = await this.db.execute(sql`
      select kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
       and kcu.table_schema = tc.table_schema
      where tc.table_schema = 'public' and tc.table_name = ${table}
        and tc.constraint_type = 'PRIMARY KEY'
      order by kcu.ordinal_position
    `);
    return result.rows.map((row) => String(row.column_name));
  }

  async foreignKeys({ table }: { table: string }): Promise<AdminForeignKey[]> {
    const result = await this.db.execute(sql`
      select kcu.column_name as from_column, ccu.table_name as foreign_table,
        ccu.column_name as to_column
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
       and kcu.table_schema = tc.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.table_schema = tc.table_schema
      where tc.table_schema = 'public' and tc.table_name = ${table}
        and tc.constraint_type = 'FOREIGN KEY'
      order by kcu.ordinal_position
    `);
    return result.rows.map((row) => ({
      table: String(row.foreign_table),
      from: String(row.from_column),
      to: String(row.to_column),
    }));
  }

  async referencingForeignKeys({ table }: { table: string }) {
    const names = await this.tableNames();
    const lists = await Promise.all(
      names.map(async (name) =>
        (await this.foreignKeys({ table: name }))
          .filter((key) => key.table === table)
          .map((key) => ({ ...key, table: name })),
      ),
    );
    return lists.flat();
  }

  async rowKeyWhere({ table, rowKey }: { table: string; rowKey: string }) {
    const columns = await this.primaryKeyColumns({ table });
    const values = decodeAdminRowKey({ rowKey });
    if (columns.length !== values.length)
      throw new NotFoundException("Row key does not match table");
    return sql.join(
      columns.map((column, index) => sql`${sql.identifier(column)} = ${values[index]}`),
      sql` and `,
    );
  }

  async readRawRow({ table, rowKey }: { table: string; rowKey: string }): Promise<Row> {
    const where = await this.rowKeyWhere({ table, rowKey });
    const result = await this.db.execute(sql`
      select * from ${sql.identifier(table)} where ${where}
    `);
    const row = result.rows[0];
    if (!row) throw new NotFoundException(`Row no longer exists in ${table}`);
    return row;
  }

  async count({ table, where }: { table: string; where?: SQL }) {
    const result = await this.db.execute(sql`
      select count(*) as n from ${sql.identifier(table)}
      ${where ? sql`where ${where}` : sql``}
    `);
    return Number(result.rows[0]?.n ?? 0);
  }
}
