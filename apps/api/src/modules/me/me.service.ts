import type { AuthSession } from "@api/auth/auth";
import { AuthService } from "@api/core/auth/auth.service";

export type MeAuth = {
  updateUser: AuthService["updateUser"];
  getSession: AuthService["getSession"];
  removeUser: AuthService["removeUser"];
};

export class MeService {
  static readonly inject = { auth: AuthService };

  constructor({ auth }: { auth: MeAuth }) {
    this.auth = auth;
  }

  readonly auth: MeAuth;

  profile({ session }: { session: AuthSession }) {
    return { user: session.user };
  }

  async deleteAccount({ session, headers }: { session: AuthSession; headers: Headers }) {
    await this.auth.removeUser({
      body: { userId: session.user.id },
      headers,
    });
    return { success: true as const };
  }

  async updateName({ name, headers }: { name: string; headers: Headers }) {
    await this.auth.updateUser({ body: { name }, headers });
    const updated = await this.auth.getSession({ headers });
    if (!updated) return { ok: false as const };
    return { ok: true as const, user: updated.user };
  }
}
