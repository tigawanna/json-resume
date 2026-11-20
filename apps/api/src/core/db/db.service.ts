import type { AppDb } from "@api/db/client";

/** Injectable Drizzle handle. Bind a fresh instance in `createApp` / tests. */
export class DbService {
  constructor({ db }: { db: AppDb }) {
    this.db = db;
  }

  readonly db: AppDb;
}
