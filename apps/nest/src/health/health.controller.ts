import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { sql } from "drizzle-orm";
import { Public } from "../auth/helpers/auth.decorators.js";
import { DRIZZLE, type DrizzleDB } from "../database/database.module.js";
import { ReadinessService } from "./readiness.service.js";

/** Platform probes, kept at the root and out of the product OpenAPI document. */
@ApiExcludeController()
@Controller()
export class HealthController {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly readiness: ReadinessService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get("health")
  live() {
    return { status: "ok" };
  }

  @Public()
  @SkipThrottle()
  @Get("ready")
  async ready() {
    if (this.readiness.isShuttingDown) throw new ServiceUnavailableException("shutting down");
    try {
      await this.db.execute(sql`select 1`);
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("database unavailable");
    }
  }
}
