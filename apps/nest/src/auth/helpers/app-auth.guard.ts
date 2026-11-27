import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { NodeRequest } from '@nestjs/platform-node';
import { user } from '@repo/db/schema/auth-schema';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import type { Auth } from '../better-auth/create-auth.js';
import { ADMIN_BYPASS_SECRET, IS_PUBLIC, MOCK_AUTH, ROLES } from './auth.constants.js';
import { DEV_ADMIN_USER, matchesAdminBypassHeader } from './dev-admin-bypass.js';
import type { AuthSession, UserWithRole } from './utils.js';
import { hasRole } from './utils.js';

type RequestWithUser = NodeRequest & { user?: UserWithRole; session?: AuthSession };

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService<Auth>,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(MOCK_AUTH) private readonly mockAuth: boolean,
    @Inject(ADMIN_BYPASS_SECRET) private readonly adminBypassSecret: string | undefined,
  ) {}

  /** Attach the signed-in user, then allow public routes or enforce auth, ban, and role. */
  async canActivate(executionContext: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    const request = executionContext
      .switchToHttp()
      .getRequest<RequestWithUser>();
    const current = await this.resolveCurrentUser({ request });
    if (current) request.user = current.user;
    if (current?.session) request.session = current.session;
    if (isPublic) return true;
    if (!current) throw new UnauthorizedException();
    if (current.user.banned) throw new ForbiddenException('Account is banned');
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES,
      [executionContext.getHandler(), executionContext.getClass()],
    );
    if (required && !hasRole({ role: current.user.role, required })) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }

  /** Read the Better Auth session, or the mock user when tests enable mock auth. */
  private async resolveCurrentUser({
    request,
  }: {
    request: RequestWithUser;
  }): Promise<{ user: UserWithRole; session?: AuthSession } | undefined> {
    if (
      matchesAdminBypassHeader({
        header: firstHeaderValue(request.header('x-admin')),
        secret: this.adminBypassSecret,
      })
    ) {
      return { user: DEV_ADMIN_USER };
    }
    if (this.mockAuth) {
      const user = await this.resolveUserFromMockHeader({ request });
      return user ? { user } : undefined;
    }
    const session = await this.auth.api.getSession({
      headers: requestToFetchHeaders({ request }),
    });
    if (!session) return undefined;
    return {
      user: {
        ...session.user,
        role: session.user.role ?? undefined,
        banned: session.user.banned ?? null,
      },
      session,
    };
  }

  /** Load the user named by the x-mock-user header. Missing or unknown ids stay unsigned. */
  private async resolveUserFromMockHeader({
    request,
  }: {
    request: RequestWithUser;
  }): Promise<UserWithRole | undefined> {
    const userId = firstHeaderValue(request.header('x-mock-user'))?.trim();
    if (!userId) return undefined;
    const [row] = await this.db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (!row) return undefined;
    return {
      ...row,
      role: row.role ?? undefined,
      image: row.image ?? undefined,
      banReason: row.banReason ?? undefined,
      banExpires: row.banExpires ?? undefined,
      banned: row.banned ?? null,
    };
  }
}

function firstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Copy incoming request headers into the Headers object Better Auth expects. */
function requestToFetchHeaders({ request }: { request: NodeRequest }) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  return headers;
}
