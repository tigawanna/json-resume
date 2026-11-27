import { Inject, Injectable } from '@nestjs/common';
import { user } from '@repo/db/schema/auth-schema';
import { syncEvent } from '@repo/db/schema/sync-schema';
import { getTableName, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import { quoteIdent } from '../tables/admin-table-metadata.service.js';

type Backup = { table: string; rows: number; createdAt: number };

const EVENT_LOG_TABLE = getTableName(syncEvent);
const USER_TABLE = getTableName(user);
const BACKUP_PREFIX = `${EVENT_LOG_TABLE}_backup_`;
const BACKUP_NAME = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;

@Injectable()
export class EventLogBackupService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(): Promise<Backup[]> {
    const result = await this.db.$client.execute({
      sql: `select name from sqlite_master where type = 'table' and name like ? order by name desc`,
      args: [`${BACKUP_PREFIX}%`],
    });
    const backups: Backup[] = [];
    for (const row of result.rows) {
      const table = row.name;
      if (typeof table !== 'string') continue;
      const createdAt = this.createdAtOf({ table });
      if (createdAt === null) continue;
      backups.push({ table, rows: await this.count({ table }), createdAt });
    }
    return backups;
  }

  async create() {
    const backup = await this.newBackupName();
    await this.createTable({ backup });
    return { backup, rows: await this.count({ table: backup }) };
  }

  async drop({ table }: { table: string }) {
    await this.requireBackup({ table });
    await this.db.$client.execute(`drop table ${quoteIdent({ name: table })}`);
    return { dropped: table };
  }

  async restore({ table }: { table: string }) {
    await this.requireBackup({ table });
    const saved = await this.columnsOf({ table });
    const live = await this.columnsOf({ table: EVENT_LOG_TABLE });
    const names = live.filter((name) => saved.includes(name));
    const columns = names.map((name) => quoteIdent({ name })).join(', ');
    const result = await this.db.$client.execute(
      `insert or ignore into ${quoteIdent({ name: EVENT_LOG_TABLE })} (${columns})
       select ${columns} from ${quoteIdent({ name: table })}
       where "user_id" in (select "id" from ${quoteIdent({ name: USER_TABLE })})
       order by "global_seq"`,
    );
    return { restored: result.rowsAffected };
  }

  async backupAndEmpty() {
    const backup = await this.newBackupName();
    const [counted] = (
      await this.db.$client.execute(`select count(*) as n from ${quoteIdent({ name: EVENT_LOG_TABLE })}`)
    ).rows;
    await this.db.transaction(async (tx) => {
      await tx.run(
        sql.raw(
          `create table ${quoteIdent({ name: backup })} as select * from ${quoteIdent({ name: EVENT_LOG_TABLE })}`,
        ),
      );
      await tx.run(sql.raw(`delete from ${quoteIdent({ name: EVENT_LOG_TABLE })}`));
    });
    return { backup, deleted: counted?.n === undefined ? 0 : Number(counted.n) };
  }

  private async requireBackup({ table }: { table: string }) {
    const backups = await this.list();
    if (!backups.some((backup) => backup.table === table))
      throw new Error(`"${table}" is not an event log backup`);
  }

  private createdAtOf({ table }: { table: string }) {
    const suffix = table.slice(BACKUP_PREFIX.length);
    const match = BACKUP_NAME.exec(suffix);
    if (!match) return null;
    const [, year, month, day, hour, minute, second] = match.map(Number);
    if (
      year === undefined || month === undefined || day === undefined ||
      hour === undefined || minute === undefined || second === undefined
    )
      return null;
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }

  private async newBackupName() {
    const result = await this.db.$client.execute({
      sql: `select name from sqlite_master where type = 'table' and name like ?`,
      args: [`${BACKUP_PREFIX}%`],
    });
    const taken = new Set(
      result.rows.flatMap((row) => (typeof row.name === 'string' ? [row.name] : [])),
    );
    let seconds = Math.floor(Date.now() / 1000);
    for (;;) {
      const name = `${BACKUP_PREFIX}${new Date(seconds * 1000)
        .toISOString()
        .replace(/[^0-9]/g, '')
        .slice(0, 14)}`;
      if (!taken.has(name)) return name;
      seconds += 1;
    }
  }

  private async createTable({ backup }: { backup: string }) {
    await this.db.$client.execute(
      `create table ${quoteIdent({ name: backup })} as select * from ${quoteIdent({ name: EVENT_LOG_TABLE })}`,
    );
  }

  private async count({ table }: { table: string }) {
    const result = await this.db.$client.execute(
      `select count(*) as n from ${quoteIdent({ name: table })}`,
    );
    return Number(result.rows[0]?.n ?? 0);
  }

  private async columnsOf({ table }: { table: string }) {
    const result = await this.db.$client.execute({
      sql: `pragma table_info(${quoteIdent({ name: table })})`,
      args: [],
    });
    return result.rows
      .map((row) => row.name)
      .filter((name): name is string => typeof name === 'string');
  }
}
