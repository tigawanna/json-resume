import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { getUserIdByEmail, serverDatabaseUrl } from "./database";

export async function addGitHubAccountForUser(email: string) {
  const userId = await getUserIdByEmail(email);
  const pool = new Pool({ connectionString: serverDatabaseUrl, max: 1 });
  const id = `github-account-${randomUUID()}`;
  const now = new Date();

  try {
    await pool.query(
      `insert into account (
        id, account_id, provider_id, user_id, access_token, created_at, updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7)`,
      [id, "playwright-user", "github", userId, "playwright-github-token", now, now],
    );
  } finally {
    await pool.end();
  }

  return { userId };
}
