import "@tanstack/react-start/server-only";

import { auth } from "@/lib/auth";

export type ApiKeyPermissionCheck = Record<string, string[]>;

export type ApiKeyAuthResult = {
  userId: string;
  keyId: string;
  name: string | null;
};

export function readApiKeyFromHeaders(headers: Headers): string | null {
  const explicitKey = headers.get("x-api-key")?.trim();
  if (explicitKey) return explicitKey;

  const authorization = headers.get("authorization")?.trim();
  const bearerPrefix = "Bearer ";
  if (authorization?.startsWith(bearerPrefix)) {
    return authorization.slice(bearerPrefix.length).trim();
  }

  return null;
}

function readApiKey(request: Request): string | null {
  return readApiKeyFromHeaders(request.headers);
}

export async function authenticateApiKeyHeaders(
  headers: Headers,
  permissions?: ApiKeyPermissionCheck,
): Promise<ApiKeyAuthResult | null> {
  const key = readApiKeyFromHeaders(headers);
  if (!key) return null;

  const result = await auth.api.verifyApiKey({
    body: {
      key,
      permissions,
    },
  });

  if (!result.valid || !result.key) {
    return null;
  }

  return {
    userId: result.key.referenceId,
    keyId: result.key.id,
    name: result.key.name,
  };
}

export async function authenticateApiKeyRequest(
  request: Request,
  permissions?: ApiKeyPermissionCheck,
): Promise<ApiKeyAuthResult | null> {
  if (!readApiKey(request)) return null;

  return authenticateApiKeyHeaders(request.headers, permissions);
}
