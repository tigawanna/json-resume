import { Controller, Get } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";

import type { AppUser } from "../helpers/app-user.js";
import { CurrentUser, Roles } from "../helpers/auth.decorators.js";

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
