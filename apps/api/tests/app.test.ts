import { describe, expect, it } from "vitest";
import { app } from "@api/app";
import { apiClient } from "@api/core/testing/api-client";

describe("apps/api smoke", () => {
  it("GET /api/health is mounted", async () => {
    const res = await apiClient.api.health.$get();
    expect(res.status).toBe(200);
  });

  it("unknown route returns 404 with the standard error body", async () => {
    const res = await app.request("/api/does-not-exist");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
