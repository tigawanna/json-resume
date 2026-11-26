import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import {
  escapeLike,
  quoteIdent,
  ROWID_ALIAS,
  toCell,
} from './admin-table-metadata.service.js';
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
    const name = await this.metadata.requireTable({ table });
    const columns = await this.metadata.columns({ table: name });
    const from = quoteIdent({ name });
    const query = q?.trim();
    const args: Array<string | number> = [];
    let condition = '1 = 1';
    if (query && columns.length > 0) {
      condition = columns
        .map(
          (column) =>
            `cast(${quoteIdent({ name: column.name })} as text) like ? escape '\\'`,
        )
        .join(' or ');
      for (const _column of columns)
        args.push(`%${escapeLike({ value: query })}%`);
    }
    const where = condition === '1 = 1' ? '' : `where ${condition}`;

    const [total, rows] = await Promise.all([
      this.metadata.count({ table: name, where: condition, args }),
      this.db.$client.execute({
        sql: `select rowid as ${ROWID_ALIAS}, * from ${from} ${where} order by rowid desc limit ? offset ?`,
        args: [...args, pageSize, page * pageSize],
      }),
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
        return { rowid: Number(row[ROWID_ALIAS]), cells };
      }),
    };
  }
}
