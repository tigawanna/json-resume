import { HealthService } from "@api/modules/health/health.service";
import { describe, expect, it } from "vitest";

describe("HealthService", () => {
  it("returns the liveness payload", () => {
    expect(new HealthService().status()).toEqual({
      status: "ok",
      service: "agentic-json-resume-api",
    });
  });
});
