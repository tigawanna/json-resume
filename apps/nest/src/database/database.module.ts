import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { schema } from "@repo/db/schema/index";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { drizzle } from "drizzle-orm/libsql/web";
import type { AppEnv } from "../config/env.schema.js";

export const DRIZZLE = Symbol("DRIZZLE");

/** HTTP libSQL client. File and memory URLs belong to the test harness, not here. */
export function createDrizzle({ url, authToken }: { url: string; authToken?: string }) {
  return drizzle({
    connection: { url, authToken },
    schema,
  });
}

export type DrizzleDB = LibSQLDatabase<typeof schema>;

@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) =>
        createDrizzle({
          url: config.get("DATABASE_URL", { infer: true }),
          authToken: config.get("DATABASE_AUTH_TOKEN", { infer: true }),
        }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
