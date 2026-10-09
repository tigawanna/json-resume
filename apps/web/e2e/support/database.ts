import { createClient, type InArgs } from "@libsql/client";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The app server's database — also the sync server's event log (`sync_event`). */
export const serverDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  `file:${fileURLToPath(new URL("../../.test/db/e2e.sqlite", import.meta.url))}`;

/** Rows come back as plain objects keyed by column name. */
export async function queryServerDb(sql: string, args: InArgs = []): Promise<unknown[]> {
  const client = createClient({ url: serverDatabaseUrl, authToken: "" });
  try {
    const result = await client.execute({ sql, args });
    return result.rows.map((row) => Object.fromEntries(result.columns.map((c) => [c, row[c]])));
  } finally {
    client.close();
  }
}

/** Consistent copy of the server database at `filePath`, safe while the server is writing. */
export async function snapshotServerDb(filePath: string) {
  rmSync(filePath, { force: true });
  const client = createClient({ url: serverDatabaseUrl, authToken: "" });
  try {
    await client.execute({ sql: "vacuum into ?", args: [filePath] });
    return filePath;
  } finally {
    client.close();
  }
}

export async function getUserIdByEmail(email: string) {
  const client = createClient({ url: serverDatabaseUrl, authToken: "" });
  try {
    const result = await client.execute({
      sql: "select id from user where email = ?",
      args: [email],
    });
    const id = result.rows[0]?.id;
    if (typeof id !== "string") {
      throw new Error(`Could not find test user ${email}`);
    }
    return id;
  } finally {
    client.close();
  }
}
