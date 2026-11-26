import { createClient } from '@libsql/client';
import { schema } from '@repo/db/schema/index';
import { drizzle } from 'drizzle-orm/libsql';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { TestDatabase } from './create-test-app.js';

const DEFAULT_SOURCE = resolve(
  import.meta.dirname,
  '../../../../.local-db/json-resume.db',
);

/**
 * Materialize a compact snapshot of the real local SQLite database.
 *
 * The source may have an uncheckpointed WAL, so stage the db/-wal/-shm together
 * and let VACUUM INTO produce a consistent file in a temporary directory. Tests
 * can then mutate the snapshot freely without touching the developer's copy.
 */
export async function copyLocalDatabase({
  source = process.env.NEST_TEST_DATABASE ?? DEFAULT_SOURCE,
}: {
  source?: string;
} = {}): Promise<TestDatabase> {
  const directory = mkdtempSync(join(tmpdir(), 'nest-real-db-'));
  const staged = join(directory, 'source.db');
  const snapshot = join(directory, 'test.db');
  let client: ReturnType<typeof createClient> | undefined;

  try {
    for (const suffix of ['', '-wal', '-shm']) {
      const from = `${source}${suffix}`;
      if (existsSync(from)) copyFileSync(from, `${staged}${suffix}`);
    }
    client = createClient({ url: `file:${staged}` });
    await client.execute({
      sql: `vacuum into '${snapshot.replaceAll("'", "''")}'`,
      args: [],
    });
    client.close();
    client = undefined;
    for (const suffix of ['', '-wal', '-shm'])
      rmSync(`${staged}${suffix}`, { force: true });

    const snapshotClient = createClient({ url: `file:${snapshot}` });
    return {
      db: drizzle({ client: snapshotClient, schema }),
      close() {
        snapshotClient.close();
        rmSync(directory, { recursive: true, force: true });
      },
    };
  } catch (error: unknown) {
    client?.close();
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}
