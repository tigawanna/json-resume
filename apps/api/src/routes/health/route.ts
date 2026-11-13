import { Hono } from "hono";
import type { AppEnv } from "@api/types";

/** Public liveness probe. No session, no database. */
export const healthRoute = new Hono<AppEnv>().get("/", (c) =>
  c.json({ status: "ok", service: "agentic-json-resume-api" }),
);
