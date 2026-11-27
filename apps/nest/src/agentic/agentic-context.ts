import type {
  AgenticAuthService,
  ApiKeyPermissionCheck,
} from './agentic-auth.service.js';

export type AgenticInitialContext = {
  headers: Headers;
  auth: AgenticAuthService;
};

export type AgenticCurrentContext = {
  headers: Headers;
  userId: string;
};

export type AgenticAuthenticate = (
  permissions: ApiKeyPermissionCheck,
) => Promise<string | null>;
