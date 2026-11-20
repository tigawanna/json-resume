import type { AppEnv } from "@api/types";
import { HealthService } from "@api/modules/health/health.service";
import { Hono } from "hono";

function createHealthRoutes({ health }: { health: HealthService }) {
  return new Hono<AppEnv>().get("/", (c) => c.json(health.status()));
}

export class HealthController {
  static readonly inject = { health: HealthService };

  constructor({ health }: { health: HealthService }) {
    this.routes = createHealthRoutes({ health });
  }

  readonly routes: ReturnType<typeof createHealthRoutes>;
}
