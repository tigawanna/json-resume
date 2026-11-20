import { Hono } from "hono";
import type { AppEnv } from "@api/types";
import { creditsAdminRoute } from "./credits";
import { waitlistAdminRoute } from "./waitlist";

export const adminRoute = new Hono<AppEnv>()
  .route("/waitlist", waitlistAdminRoute)
  .route("/credits", creditsAdminRoute);
