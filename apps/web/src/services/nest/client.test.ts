import { afterEach, describe, expect, it, vi } from "vite-plus/test";

describe("Nest Kubb client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doUnmock("@tanstack/react-start/server");
    vi.resetModules();
  });

  it("uses the Nest origin and sends session cookies", async () => {
    vi.stubEnv("VITE_NEST_API_URL", "http://localhost:5040");
    const fetchMock = mockFetch();
    const { adminStatsControllerRead } = await import("./client");

    await expect(adminStatsControllerRead()).resolves.toEqual({ users: 1 });
    const [request] = fetchMock.mock.calls[0];
    expect(request).toBeInstanceOf(Request);
    if (!(request instanceof Request)) throw new Error("Expected a Request");
    expect(request.url).toBe("http://localhost:5040/api/admin/stats");
    expect(request.credentials).toBe("include");
  });

  it("forwards the incoming cookie when rendering on the server", async () => {
    vi.stubEnv("VITE_NEST_API_URL", "http://localhost:5040");
    vi.doMock("@tanstack/react-start/server", () => ({
      getRequestHeaders: () => new Headers({ cookie: "session=test" }),
    }));
    const fetchMock = mockFetch();
    const { adminStatsControllerRead } = await import("./client");

    await adminStatsControllerRead();
    const [request] = fetchMock.mock.calls[0];
    expect(request).toBeInstanceOf(Request);
    if (!(request instanceof Request)) throw new Error("Expected a Request");
    expect(request.headers.get("cookie")).toBe("session=test");
  });
});

function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ users: 1 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}
