import type { AppEnv } from "@api/types";
import { Hono } from "hono";
import { projectSyncEventsRoute } from "./project-sync-events";
import { squashSyncEventsRoute } from "./squash-sync-events";

const cronRoute = new Hono<AppEnv>()
  .route("/project-sync-events", projectSyncEventsRoute)
  .route("/squash-sync-events", squashSyncEventsRoute);

export class CronController {
  readonly routes = cronRoute;
}
