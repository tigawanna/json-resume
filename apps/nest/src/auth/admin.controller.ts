import { Controller, Get } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles } from "./auth.decorators.js";
import type { AppUser } from "./app-user.js";

/** Probe used to test the role guard. Not an admin product API. */
@ApiTags("auth")
@ApiCookieAuth()
@Controller("admin")
export class AdminController {
  @Get("session")
  @Roles({ roles: ["admin"] })
  session(@CurrentUser() current: AppUser) {
    return { id: current.id, role: current.role };
  }
}
