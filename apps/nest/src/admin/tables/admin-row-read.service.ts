import { Injectable } from '@nestjs/common';
import {
  isSecret,
  AdminTableMetadataService,
} from './admin-table-metadata.service.js';
import { isEditable, lockedColumnsFor } from './admin-row-columns.js';
import { rowModeFor } from './admin-table-registry.js';

@Injectable()
export class AdminRowReadService {
  constructor(private readonly metadata: AdminTableMetadataService) {}

  async read({ table, rowid }: { table: string; rowid: number }) {
    const name = await this.metadata.requireTable({ table });
    const mode = rowModeFor({ table: name });
    const [columns, row, locked] = await Promise.all([
      this.metadata.columns({ table: name }),
      this.metadata.readRawRow({ table: name, rowid }),
      lockedColumnsFor({ metadata: this.metadata, mode, table: name }),
    ]);
    const fields = columns.map((column) => {
      const raw = row[column.name];
      const base = {
        name: column.name,
        type: column.type,
        primaryKey: column.primaryKey,
        notNull: column.notNull,
        editable: isEditable({ mode, table: name, column, locked }),
      };
      if (isSecret({ table: name, column: column.name }))
        return { ...base, value: null, kind: 'secret' };
      if (raw instanceof ArrayBuffer)
        return {
          ...base,
          value: `<binary ${raw.byteLength} bytes>`,
          kind: 'binary',
        };
      if (typeof raw === 'bigint')
        return { ...base, value: raw.toString(), kind: 'value' };
      return { ...base, value: raw ?? null, kind: 'value' };
    });
    return { table: name, rowid, mode, fields };
  }
}
