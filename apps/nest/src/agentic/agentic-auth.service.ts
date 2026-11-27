import { AuthService } from '@thallesp/nestjs-better-auth';
import { Inject, Injectable } from '@nestjs/common';
import type { Auth } from '../auth/better-auth/create-auth.js';

export type ApiKeyPermissionCheck = Record<string, string[]>;

export type ApiKeyAuthResult = {
  userId: string;
  keyId: string;
  name: string | null;
};

@Injectable()
export class AgenticAuthService {
  constructor(@Inject(AuthService) private readonly auth: AuthService<Auth>) {}

  async authenticate({
    headers,
    permissions,
  }: {
    headers: Headers;
    permissions: ApiKeyPermissionCheck;
  }): Promise<ApiKeyAuthResult | null> {
    const key = readApiKey({ headers });
    if (!key) return null;
    const result = await this.auth.api.verifyApiKey({
      body: { key, permissions },
    });
    if (!result.valid || !result.key?.referenceId) return null;
    return {
      userId: result.key.referenceId,
      keyId: result.key.id,
      name: result.key.name,
    };
  }
}

function readApiKey({ headers }: { headers: Headers }) {
  const explicit = headers.get('x-api-key')?.trim();
  if (explicit) return explicit;
  const authorization = headers.get('authorization')?.trim();
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
}
