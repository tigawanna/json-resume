import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { schema } from '@repo/db/schema/index';
import { drizzle } from 'drizzle-orm/libsql';
import type { AppEnv } from '../config/env.schema.js';

export const DRIZZLE = Symbol('DRIZZLE');

/** Node libSQL client: accepts remote (libsql/http/ws) and local `file:` URLs. */
export function createDrizzle({
  url,
  authToken,
}: {
  url: string;
  authToken?: string;
}) {
  return drizzle({
    connection: { url, authToken },
    schema,
  });
}

export type DrizzleDB = ReturnType<typeof createDrizzle>;

@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) =>
        createDrizzle({
          url: config.get('DATABASE_URL', { infer: true }),
          authToken: config.get('DATABASE_AUTH_TOKEN', { infer: true }),
        }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
