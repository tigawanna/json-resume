import { apiOrigin } from "@/lib/env/client-env";

const TOKEN_URL = `${apiOrigin}/api/auth/token`;

let cached: { token: string; expiresAtMs: number } | null = null;

function payloadExpMs({ token }: { token: string }): number | null {
  const segment = token.split(".")[1];
  if (!segment) return null;
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const payload: unknown = JSON.parse(atob(padded));
  if (payload === null || typeof payload !== "object" || !("exp" in payload)) return null;
  if (typeof payload.exp !== "number") return null;
  return payload.exp * 1000;
}

/**
 * Short-lived access token from Better Auth (`GET /api/auth/token`). Cached
 * until a minute before `exp` so sync bursts reuse one JWT.
 */
export async function getSyncAccessToken(): Promise<string | null> {
  if (cached && cached.expiresAtMs - 60_000 > Date.now()) return cached.token;

  const response = await fetch(TOKEN_URL, { credentials: "include" });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  if (body === null || typeof body !== "object" || !("token" in body)) return null;
  if (typeof body.token !== "string") return null;

  const expiresAtMs = payloadExpMs({ token: body.token }) ?? Date.now() + 14 * 60_000;
  cached = { token: body.token, expiresAtMs };
  return body.token;
}

export async function syncAuthHeaders({ extra }: { extra?: HeadersInit } = {}): Promise<Headers> {
  const headers = new Headers(extra);
  const token = await getSyncAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}
