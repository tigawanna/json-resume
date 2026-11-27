import { Inject, Injectable } from "@nestjs/common";
import { user } from "@repo/db/postgres/schema/auth-schema";
import { syncEvent } from "@repo/db/postgres/schema/sync-schema";
import { getTableName, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../database/database.module.js";

type Backup = { table: string; rows: number; createdAt: number };

const EVENT_LOG_TABLE = getTableName(syncEvent);
const USER_TABLE = getTableName(user);
const BACKUP_PREFIX = `${EVENT_LOG_TABLE}_backup_`;
const BACKUP_NAME = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;

@Injectable()
export class EventLogBackupService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(): Promise<Backup[]> {
    const backups: Backup[] = [];
    for (const table of await this.backupNames()) {
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
    await this.db.execute(sql`drop table ${sql.identifier(table)}`);
    return { dropped: table };
  }

  async restore({ table }: { table: string }) {
    await this.requireBackup({ table });
    const saved = await this.columnsOf({ table });
    const live = await this.columnsOf({ table: EVENT_LOG_TABLE });
    const names = live.filter((name) => saved.includes(name));
    const columns = sql.join(
      names.map((name) => sql.identifier(name)),
      sql`, `,
    );
    const result = await this.db.execute(sql`
      insert into ${sql.identifier(EVENT_LOG_TABLE)} (${columns})
      select ${columns} from ${sql.identifier(table)}
      where ${sql.identifier("user_id")} in (
        select ${sql.identifier("id")} from ${sql.identifier(USER_TABLE)}
      )
      order by ${sql.identifier("global_seq")}
      on conflict do nothing
    `);
    return { restored: result.rowCount ?? 0 };
  }

  async backupAndEmpty() {
    const backup = await this.newBackupName();
    const [counted] = (
      await this.db.execute(sql`select count(*) as n from ${sql.identifier(EVENT_LOG_TABLE)}`)
    ).rows;
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        create table ${sql.identifier(backup)} as
        select * from ${sql.identifier(EVENT_LOG_TABLE)}
      `);
      await tx.execute(sql`delete from ${sql.identifier(EVENT_LOG_TABLE)}`);
    });
    return { backup, deleted: Number(counted?.n ?? 0) };
  }

  private async requireBackup({ table }: { table: string }) {
    if (!(await this.backupNames()).includes(table))
      throw new Error(`"${table}" is not an event log backup`);
  }

  private createdAtOf({ table }: { table: string }) {
    const suffix = table.slice(BACKUP_PREFIX.length);
    const match = BACKUP_NAME.exec(suffix);
    if (!match) return null;
    const [, year, month, day, hour, minute, second] = match.map(Number);
    if (
      year === undefined ||
      month === undefined ||
      day === undefined ||
      hour === undefined ||
      minute === undefined ||
      second === undefined
    )
      return null;
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }

  private async backupNames() {
    const result = await this.db.execute(sql`
      select table_name as name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
        and starts_with(table_name, ${BACKUP_PREFIX})
      order by table_name desc
    `);
    return result.rows.flatMap((row) => (typeof row.name === "string" ? [row.name] : []));
  }

  private async newBackupName() {
    const taken = new Set(await this.backupNames());
    let seconds = Math.floor(Date.now() / 1000);
    for (;;) {
      const name = `${BACKUP_PREFIX}${new Date(seconds * 1000)
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, 14)}`;
      if (!taken.has(name)) return name;
      seconds += 1;
    }
  }

  private async createTable({ backup }: { backup: string }) {
    await this.db.execute(sql`
      create table ${sql.identifier(backup)} as
      select * from ${sql.identifier(EVENT_LOG_TABLE)}
    `);
  }

  private async count({ table }: { table: string }) {
    const result = await this.db.execute(sql`select count(*) as n from ${sql.identifier(table)}`);
    return Number(result.rows[0]?.n ?? 0);
  }

  private async columnsOf({ table }: { table: string }) {
    const result = await this.db.execute(sql`
      select column_name as name from information_schema.columns
      where table_schema = 'public' and table_name = ${table}
      order by ordinal_position
    `);
    return result.rows.flatMap((row) => (typeof row.name === "string" ? [row.name] : []));
  }
}
