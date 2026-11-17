import { user } from "@repo/db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "@api/app";
import { db } from "@api/db/client";
import { env } from "@api/env";

const createdEmails: string[] = [];

afterAll(async () => {
  for (const email of createdEmails) {
    await db.delete(user).where(eq(user.email, email));
  }
});

async function signInCookie({ email }: { email: string }) {
  createdEmails.push(email);
  const signup = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123", name: "Jwt User" }),
  });
  expect(signup.status).toBe(200);
  const setCookie = signup.headers.get("set-cookie");
  expect(setCookie).toBeTruthy();
  return setCookie!.split(";")[0]!;
}

describe("Better Auth JWT", () => {
  it("serves OpenID discovery for the API Gateway authorizer", async () => {
    const res = await app.request("/.well-known/openid-configuration");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { issuer: string; jwks_uri: string };
    expect(body.issuer).toBe(env.BETTER_AUTH_URL);
    expect(body.jwks_uri).toBe(`${env.BETTER_AUTH_URL}/api/auth/jwks`);
  });

  it("issues an ES256 JWT for a signed-in session and publishes JWKS", async () => {
    const cookie = await signInCookie({ email: `jwt+${Date.now()}@example.com` });

    const tokenRes = await app.request("/api/auth/token", { headers: { Cookie: cookie } });
    expect(tokenRes.status).toBe(200);
    const { token } = (await tokenRes.json()) as { token: string };
    expect(token.split(".")).toHaveLength(3);

    const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString()) as {
      iss: string;
      aud: string;
    };
    expect(payload.iss).toBe(env.BETTER_AUTH_URL);
    expect(payload.aud).toBe(env.BETTER_AUTH_URL);

    const jwks = await app.request("/api/auth/jwks");
    expect(jwks.status).toBe(200);
    const { keys } = (await jwks.json()) as { keys: Array<{ alg: string }> };
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0]?.alg).toBe("ES256");
  });
});
