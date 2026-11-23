import { Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { CreditsGuard } from "../credits/credits.guard.js";
import { WaitlistGuard } from "../waitlist/waitlist.guard.js";

const pending = { status: "accepted" as const, implementation: "pending" as const };

/**
 * Stub only. Guards decide who may call. The handler does not project events,
 * write rows, or charge credits.
 */
@ApiTags("sync")
@ApiCookieAuth()
@UseGuards(WaitlistGuard, CreditsGuard)
@Controller("sync")
export class SyncController {
  @Get()
  get() {
    return pending;
  }

  @Post()
  @HttpCode(200)
  post() {
    return pending;
  }
}
