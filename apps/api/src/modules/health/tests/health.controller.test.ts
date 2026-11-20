import { apiClient } from "@api/core/testing/api-client";
import { describe, expect, it } from "vitest";

describe("HealthController", () => {
  it("GET /api/health returns 200 with status ok", async () => {
    const res = await apiClient.api.health.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      service: "agentic-json-resume-api",
    });
  });
});
