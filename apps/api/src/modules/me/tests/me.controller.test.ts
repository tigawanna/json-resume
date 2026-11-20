import { user } from "@repo/db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { apiClient, authSignUpRequest, sessionInit } from "@api/core/testing/api-client";
import { db } from "@api/db/client";

const createdEmails: string[] = [];

afterAll(async () => {
  for (const email of createdEmails) {
    await db.delete(user).where(eq(user.email, email));
  }
});

describe("MeController", () => {
  it("rejects updates without a session", async () => {
    const me = await apiClient.api.me.$patch({ json: { name: "Renamed" } });
    expect(me.status).toBe(401);
  });

  it("signs up, rejects a bad update, and accepts a valid name", async () => {
    const email = `test+${Date.now()}@example.com`;
    createdEmails.push(email);

    const signup = await authSignUpRequest({ email, name: "Test User" });
    expect(signup.status).toBe(200);
    const setCookie = signup.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie!.split(";")[0]!;

    const badUpdate = await apiClient.api.me.$patch(
      { json: { name: "" } },
      sessionInit({ cookie }),
    );
    expect(badUpdate.status).toBe(400);
    const errBody: unknown = await badUpdate.json();
    expect(errBody).toMatchObject({ error: { code: "VALIDATION_ERROR" } });

    const goodUpdate = await apiClient.api.me.$patch(
      { json: { name: "Renamed" } },
      sessionInit({ cookie }),
    );
    expect(goodUpdate.status).toBe(200);
    if (!goodUpdate.ok) throw new Error("expected a successful name update");
    const goodBody = await goodUpdate.json();
    expect(goodBody.user.name).toBe("Renamed");
  });
});
