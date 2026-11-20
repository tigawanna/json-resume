import type { AuthSession } from "@api/auth/auth";
import { MeService, type MeAuth } from "@api/modules/me/me.service";
import { describe, expect, it } from "vitest";

const session = {
  user: { id: "user-1", name: "Ada" },
} as AuthSession;

function fakeAuth(overrides: Partial<MeAuth> = {}): MeAuth {
  return {
    updateUser: async () => ({ status: true }),
    getSession: async () => session,
    removeUser: async () => ({ success: true }),
    ...overrides,
  };
}

describe("MeService", () => {
  it("returns the session user", () => {
    const me = new MeService({ auth: fakeAuth() });
    expect(me.profile({ session })).toEqual({ user: session.user });
  });

  it("deletes the session user through auth", async () => {
    const removed: string[] = [];
    const me = new MeService({
      auth: fakeAuth({
        removeUser: async ({ body }) => {
          removed.push(body.userId);
          return { success: true };
        },
      }),
    });
    await expect(me.deleteAccount({ session, headers: new Headers() })).resolves.toEqual({
      success: true,
    });
    expect(removed).toEqual(["user-1"]);
  });

  it("updates the name and reloads the session", async () => {
    const me = new MeService({
      auth: fakeAuth({
        getSession: async () => ({ ...session, user: { ...session.user, name: "Renamed" } }),
      }),
    });
    const result = await me.updateName({ name: "Renamed", headers: new Headers() });
    expect(result).toEqual({ ok: true, user: { id: "user-1", name: "Renamed" } });
  });

  it("returns ok false when the session cannot be reloaded", async () => {
    const me = new MeService({
      auth: fakeAuth({ getSession: async () => null }),
    });
    await expect(me.updateName({ name: "Renamed", headers: new Headers() })).resolves.toEqual({
      ok: false,
    });
  });
});
