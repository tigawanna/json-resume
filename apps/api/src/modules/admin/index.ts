import { Hono } from "hono";
import type { AppEnv } from "@api/types";
import { waitlistAdminRoute } from "./waitlist";
import { walletsAdminRoute } from "./wallets";

export const adminRoute = new Hono<AppEnv>()
  .route("/waitlist", waitlistAdminRoute)
  .route("/wallets", walletsAdminRoute);
