import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { AppUser } from "../auth/helpers/app-user.js";
import type { CreditsPolicy } from "../credits/allocate.js";
import { CREDITS_POLICY } from "../credits/credits.service.js";
import { hasJoinedWaitlist } from "../credits/eligibility.js";
import { DRIZZLE, type DrizzleDB } from "../database/database.module.js";

@Injectable()
export class WaitlistGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(CREDITS_POLICY) private readonly policy: CreditsPolicy,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (!this.policy.requireWaitlist) return true;
    const request = context.switchToHttp().getRequest<{ user?: AppUser }>();
    const current = request.user;
    if (!current) return false;
    const joined = await hasJoinedWaitlist({ db: this.db, userId: current.id });
    if (!joined) throw new ForbiddenException("Waitlist required");
    return true;
  }
}
