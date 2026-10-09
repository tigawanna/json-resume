import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { getUserIdByEmail, serverDatabaseUrl } from "./database";

export async function addGitHubAccountForUser(email: string) {
  const userId = await getUserIdByEmail(email);
  const client = createClient({ url: serverDatabaseUrl, authToken: "" });
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
