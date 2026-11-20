import type { AppEnv } from "@api/types";
import { Hono } from "hono";
import { waitlistAdminRoute } from "./waitlist";
import { walletsAdminRoute } from "./wallets";

const adminRoute = new Hono<AppEnv>()
  .route("/waitlist", waitlistAdminRoute)
  .route("/wallets", walletsAdminRoute);

export class AdminController {
  readonly routes = adminRoute;
}
