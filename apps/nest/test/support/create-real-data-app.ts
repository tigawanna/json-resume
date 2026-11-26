import { user } from '@repo/db/schema/auth-schema';
import { createTestApp } from './create-test-app.js';
import { copyLocalDatabase } from './local-database.js';

/** Boot the real app against a snapshot of the local DB: no fake users or DB. */
export async function createRealDataApp() {
  const database = await copyLocalDatabase();
  const started = await createTestApp({ database });
  const users = await started.db.select().from(user);
  const admin = users.find(isAdmin);
  const member = users.find((row) => !isAdmin(row) && !row.banned);
  if (!admin || !member) {
    await started.app.close();
    started.close();
    throw new Error('local DB snapshot needs an admin and an unbanned non-admin user');
  }
  return { ...started, admin, member };
}

function isAdmin(row: { role: string | null }) {
  return row.role?.split(',').some((role) => role.trim() === 'admin') ?? false;
}
