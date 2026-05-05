import "@tanstack/react-start/server-only";

import { auth } from "@/lib/auth";

export type ApiKeyPermissionCheck = Record<string, string[]>;

export type ApiKeyAuthResult = {
  userId: string;
  keyId: string;
  name: string | null;
};

function readApiKey(request: Request): string | null {
  const explicitKey = request.headers.get("x-api-key")?.trim();
  if (explicitKey) return explicitKey;

  const authorization = request.headers.get("authorization")?.trim();
  const bearerPrefix = "Bearer ";
  if (authorization?.startsWith(bearerPrefix)) {
    return authorization.slice(bearerPrefix.length).trim();
  }

  return null;
}

export async function authenticateApiKeyRequest(
  request: Request,
  permissions?: ApiKeyPermissionCheck,
): Promise<ApiKeyAuthResult | null> {
  const key = readApiKey(request);
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
