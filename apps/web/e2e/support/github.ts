import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getUserIdByEmail } from "./database";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  `file:${fileURLToPath(new URL("../../.test/db/e2e.sqlite", import.meta.url))}`;

export async function addGitHubAccountForUser(email: string) {
  const userId = await getUserIdByEmail(email);
  const client = createClient({ url: databaseUrl, authToken: "" });
  const id = `github-account-${randomUUID()}`;
  const now = Date.now();

  try {
    await client.execute({
      sql: `
        insert into account (
          id,
          account_id,
          provider_id,
          user_id,
          access_token,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, "playwright-user", "github", userId, "playwright-github-token", now, now],
    });
  } finally {
    client.close();
  }

  return { userId };
}

export async function getSavedProjectCount(userId: string, url: string) {
  const client = createClient({ url: databaseUrl, authToken: "" });

  try {
    const result = await client.execute({
      sql: "select count(*) as count from saved_project where user_id = ? and url = ?",
      args: [userId, url],
    });
    const count = result.rows[0]?.count;
    if (typeof count !== "number" && typeof count !== "bigint") {
      throw new Error(`Saved project count query did not return a numeric result for ${url}`);
    }
    return Number(count);
  } finally {
    client.close();
  }
}
