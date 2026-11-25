import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { AppUser } from "../auth/helpers/app-user.js";
import { CreditsService } from "./credits.service.js";

/** Checks that a credit exists. Does not spend it. Sync charging is a later pass. */
@Injectable()
export class CreditsGuard implements CanActivate {
  constructor(private readonly credits: CreditsService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: AppUser }>();
    const current = request.user;
    if (!current) return false;
    const { wallet } = await this.credits.allocation({ userId: current.id });
    const available = wallet.monthlyBalance + wallet.bonusBalance;
    if (available < this.credits.policy.resumeCost) {
      throw new HttpException("Not enough credits", HttpStatus.PAYMENT_REQUIRED);
    }
    return true;
  }
}
