import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { postgresMigrationsFolder } from '@repo/db/postgres/migrations';

describe('Postgres migrations', () => {
  it('resolves the generated journal next to the Postgres module', () => {
    expect(
      postgresMigrationsFolder.endsWith(join('src', 'postgres', 'migrations')),
    ).toBe(true);
    expect(
      existsSync(join(postgresMigrationsFolder, 'meta', '_journal.json')),
    ).toBe(true);
  });
});
