import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { user } from "@repo/db/schema/auth-schema";
import { DRIZZLE, type DrizzleDB } from "../database/database.module.js";
import type { AppUser } from "./app-user.js";
import { hasRole } from "./app-user.js";
import { IS_PUBLIC, MOCK_AUTH, ROLES } from "./auth.constants.js";
import type { Auth } from "./create-auth.js";

type RequestWithUser = Request & { user?: AppUser };

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService<Auth>,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(MOCK_AUTH) private readonly mockAuth: boolean,
  ) {}

  /** Attach the signed-in user, then allow public routes or enforce auth, ban, and role. */
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const current = await this.resolve({ request });
    if (current) request.user = current;
    if (isPublic) return true;
    if (!current) throw new UnauthorizedException();
    if (current.banned) throw new ForbiddenException("Account is banned");
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && !hasRole({ role: current.role, required })) {
      throw new ForbiddenException("Admin access required");
    }
    return true;
  }

  /** Read the Better Auth session, or the mock user when tests enable mock auth. */
  private async resolve({ request }: { request: RequestWithUser }): Promise<AppUser | undefined> {
    if (this.mockAuth) return this.resolveMock({ request });
    const session = await this.auth.api.getSession({ headers: headersFrom({ request }) });
    if (!session) return undefined;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role ?? null,
      banned: session.user.banned === true,
    };
  }

  /** Load the user named by the x-mock-user header. Missing or unknown ids stay unsigned. */
  private async resolveMock({
    request,
  }: {
    request: RequestWithUser;
  }): Promise<AppUser | undefined> {
    const userId = request.header("x-mock-user")?.trim();
    if (!userId) return undefined;
    const [row] = await this.db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        banned: user.banned,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!row) return undefined;
    return { ...row, banned: row.banned === true };
  }
}

/** Copy incoming request headers into the Headers object Better Auth expects. */
function headersFrom({ request }: { request: Request }) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(key, value);
    if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  return headers;
}
