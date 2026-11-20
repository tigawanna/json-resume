import type { AppEnv } from "@api/types";
import { Hono } from "hono";
import { walletCreditsRoute } from "./credits";
import { walletResourceRoute } from "./resource";

export const walletsAdminRoute = new Hono<AppEnv>()
  .route("/", walletCreditsRoute)
  .route("/", walletResourceRoute);
