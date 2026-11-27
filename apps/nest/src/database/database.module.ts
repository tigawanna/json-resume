import { Inject, Injectable, Module, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { schema } from "@repo/db/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { AppEnv } from "../config/env.schema.js";

export const DRIZZLE = Symbol("DRIZZLE");
export const PG_POOL = Symbol("PG_POOL");

export function createDrizzle({ url, poolMax }: { url: string; poolMax: number }) {
  const pool = new Pool({
    connectionString: url,
    max: poolMax,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    application_name: "agentic-json-resume-nest",
  });
  const db = drizzle({ client: pool, schema });
  return { db, pool };
}

export type DrizzleDB = ReturnType<typeof createDrizzle>["db"];
export type PgPool = ReturnType<typeof createDrizzle>["pool"];

@Injectable()
class PoolLifecycle implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: PgPool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}

@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) =>
        createDrizzle({
          url: config.get("POSTGRES_URL", { infer: true }),
          poolMax: config.get("POSTGRES_POOL_MAX", { infer: true }),
        }).pool,
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: PgPool) => drizzle({ client: pool, schema }),
    },
    PoolLifecycle,
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
