import { Hono } from "hono";
import type { AppEnv } from "@api/types";
import { syncCompactRoute } from "./compact";
import { syncEventsRoute } from "./events";

export const syncRoute = new Hono<AppEnv>()
  .route("/events", syncEventsRoute)
  .route("/compact", syncCompactRoute);
