import { Hono } from "hono";

export class HealthController {
  readonly routes = new Hono().get("/", (c) => c.json({ status: "ok" }));
}
