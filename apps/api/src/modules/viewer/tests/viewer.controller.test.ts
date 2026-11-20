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

describe("ViewerController", () => {
  it("rejects requests without a session", async () => {
    const viewer = await apiClient.api.viewer.$get();
    expect(viewer.status).toBe(401);
    const body: unknown = await viewer.json();
    expect(body).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("returns the signed-in user", async () => {
    const email = `viewer+${Date.now()}@example.com`;
    createdEmails.push(email);

    const signup = await authSignUpRequest({ email, name: "Viewer User" });
    expect(signup.status).toBe(200);
    const setCookie = signup.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie!.split(";")[0]!;

    const viewer = await apiClient.api.viewer.$get(undefined, sessionInit({ cookie }));
    expect(viewer.status).toBe(200);
    if (!viewer.ok) throw new Error("expected a signed-in viewer");
    const viewerBody = await viewer.json();
    expect(viewerBody.user.email).toBe(email);
  });
});
