import type { Auth } from "@api/auth/auth";
import type { AppDb } from "@api/db/client";
import { AuthService } from "@api/core/auth/auth.service";
import { DbService } from "@api/core/db/db.service";
import { Container } from "@api/core/di/container";

export function createAppContainer({ db, auth }: { db: AppDb; auth: Auth }) {
  const container = new Container();
  container.bind({ token: DbService, factory: () => new DbService({ db }) });
  container.bind({ token: AuthService, factory: () => new AuthService({ auth }) });
  return container;
}
