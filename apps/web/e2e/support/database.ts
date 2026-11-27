import { Pool } from "pg";
import { writeFileSync } from "node:fs";

export const serverDatabaseUrl =
  process.env.E2E_POSTGRES_URL ??
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55439/ajr_web_e2e";

function postgresPlaceholders(sql: string) {
  let index = 0;
  return sql.replaceAll("?", () => `$${++index}`);
}

export async function queryServerDb(sql: string, args: unknown[] = []): Promise<unknown[]> {
  const pool = new Pool({ connectionString: serverDatabaseUrl, max: 1 });
  try {
    const result = await pool.query(postgresPlaceholders(sql), args);
    return result.rows;
  } finally {
    await pool.end();
  }
}

export async function snapshotServerDb({ filePath, userId }: { filePath: string; userId: string }) {
  const pool = new Pool({ connectionString: serverDatabaseUrl, max: 1 });
  try {
    const [user, events, resumes] = await Promise.all([
      pool.query('select * from "user" where id = $1', [userId]),
      pool.query(
        "select global_seq, collection_id, type, key, payload, previous, projected_at from sync_event where user_id = $1 order by global_seq",
        [userId],
      ),
      pool.query("select * from resume where user_id = $1 order by updated_at desc", [userId]),
    ]);
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          userId,
          user: user.rows,
          events: events.rows,
          projectedResumes: resumes.rows,
        },
        null,
        2,
      ),
    );
    return filePath;
  } finally {
    await pool.end();
  }
}

export async function getUserIdByEmail(email: string) {
  const pool = new Pool({ connectionString: serverDatabaseUrl, max: 1 });
  try {
    const result = await pool.query('select id from "user" where email = $1', [email]);
    const id = result.rows[0]?.id;
    if (typeof id !== "string") throw new Error(`Could not find test user ${email}`);
    return id;
  } finally {
    await pool.end();
  }
}
