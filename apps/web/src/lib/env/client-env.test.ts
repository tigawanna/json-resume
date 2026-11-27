import { afterEach, describe, expect, it, vi } from "vite-plus/test";

describe("API origin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("prefers the canonical API origin", async () => {
    vi.stubEnv("VITE_API_ORIGIN", "https://api.example.com/");
    vi.stubEnv("VITE_NEST_API_URL", "https://legacy.example.com");

    const { apiOrigin } = await import("./client-env");

    expect(apiOrigin).toBe("https://api.example.com");
  });

  it("accepts the legacy Nest origin as a temporary alias", async () => {
    vi.stubEnv("VITE_API_ORIGIN", undefined);
    vi.stubEnv("VITE_NEST_API_URL", "https://legacy.example.com");

    const { apiOrigin } = await import("./client-env");

    expect(apiOrigin).toBe("https://legacy.example.com");
  });

  it("defaults to the local Nest origin", async () => {
    vi.stubEnv("VITE_API_ORIGIN", undefined);
    vi.stubEnv("VITE_NEST_API_URL", undefined);

    const { apiOrigin } = await import("./client-env");

    expect(apiOrigin).toBe("http://localhost:5040");
  });
});
