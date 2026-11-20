import type { Auth, AuthSession } from "@api/auth/auth";

/** Injectable Better Auth handle. Bind a fresh instance in `createApp` / tests. */
export class AuthService {
  constructor({ auth }: { auth: Auth }) {
    this.auth = auth;
  }

  readonly auth: Auth;

  updateUser({ body, headers }: { body: { name: string }; headers: Headers }) {
    return this.auth.api.updateUser({ body, headers });
  }

  getSession({ headers }: { headers: Headers }): Promise<AuthSession | null> {
    return this.auth.api.getSession({ headers });
  }

  removeUser({ body, headers }: { body: { userId: string }; headers: Headers }) {
    return this.auth.api.removeUser({ body, headers });
  }
}
