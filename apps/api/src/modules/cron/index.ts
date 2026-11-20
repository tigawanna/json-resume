import { Hono } from "hono";
import type { AppEnv } from "@api/types";
import { projectSyncEventsRoute } from "./project-sync-events";
import { squashSyncEventsRoute } from "./squash-sync-events";

export const cronRoute = new Hono<AppEnv>()
  .route("/project-sync-events", projectSyncEventsRoute)
  .route("/squash-sync-events", squashSyncEventsRoute);
