import { user } from "@repo/db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "@api/app";
import { db } from "@api/db/client";
const createdEmails: string[] = [];

afterAll(async () => {
  for (const email of createdEmails) {
    await db.delete(user).where(eq(user.email, email));
  }
});

describe("apps/api health", () => {
  it("GET /api/health returns 200 with status ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("agentic-json-resume-api");
  });

  it("unknown route returns 404 with the standard error body", async () => {
    const res = await app.request("/api/does-not-exist");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("apps/api auth gating", () => {
  it("GET /api/viewer without a session returns 401", async () => {
    const res = await app.request("/api/viewer");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string; code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/me without a session returns 401", async () => {
    const res = await app.request("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("apps/api auth flow", () => {
  it("signs up, reads the session, and rejects a bad update", async () => {
    const email = `test+${Date.now()}@example.com`;
    createdEmails.push(email);

    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123", name: "Test User" }),
    });
    expect(signup.status).toBe(200);
    const setCookie = signup.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    const cookie = setCookie!.split(";")[0]!;

    const viewer = await app.request("/api/viewer", {
      headers: { Cookie: cookie },
    });
    expect(viewer.status).toBe(200);
    const viewerBody = (await viewer.json()) as { user: { email: string } };
    expect(viewerBody.user.email).toBe(email);

    const badUpdate = await app.request("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "" }),
    });
    expect(badUpdate.status).toBe(400);
    const errBody = (await badUpdate.json()) as { error: { code: string } };
    expect(errBody.error.code).toBe("VALIDATION_ERROR");

    const goodUpdate = await app.request("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(goodUpdate.status).toBe(200);
    const goodBody = (await goodUpdate.json()) as { user: { name: string } };
    expect(goodBody.user.name).toBe("Renamed");
  });
});
