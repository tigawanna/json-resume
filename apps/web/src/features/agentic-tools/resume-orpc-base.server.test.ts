// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server-only", () => ({}));

const mockAuthenticateApiKeyHeaders = vi.fn();
vi.mock("@/lib/better-auth/api-key.server", () => ({
  authenticateApiKeyHeaders: (...args: unknown[]) => mockAuthenticateApiKeyHeaders(...args),
}));

import { createRouterClient } from "@orpc/server";
import { resumeReadProcedure, resumeWriteProcedure } from "./resume-orpc-base.server";

const testRouter = {
  read: resumeReadProcedure.handler(async ({ context }) => ({
    userId: context.userId,
  })),
  write: resumeWriteProcedure.handler(async ({ context }) => ({
    userId: context.userId,
  })),
};

describe("agentic auth middleware", () => {
  beforeEach(() => {
    mockAuthenticateApiKeyHeaders.mockReset();
  });

  it("passes through when userId is pre-resolved (internal caller)", async () => {
    const client = createRouterClient(testRouter, {
      context: { userId: "internal-user" },
    });
    const result = await client.read();
    expect(result.userId).toBe("internal-user");
    expect(mockAuthenticateApiKeyHeaders).not.toHaveBeenCalled();
  });

  it("rejects when neither userId nor headers are provided", async () => {
    const client = createRouterClient(testRouter, { context: {} });
    await expect(client.read()).rejects.toThrow("Unauthorized");
  });

  it("rejects when API key authentication fails", async () => {
    mockAuthenticateApiKeyHeaders.mockResolvedValue(null);
    const client = createRouterClient(testRouter, {
      context: { headers: new Headers({ "x-api-key": "invalid" }) },
    });
    await expect(client.read()).rejects.toThrow("Unauthorized");
  });

  it("resolves userId from a valid API key", async () => {
    mockAuthenticateApiKeyHeaders.mockResolvedValue({
      userId: "api-user",
      keyId: "key-1",
      name: "Test Key",
    });
    const client = createRouterClient(testRouter, {
      context: { headers: new Headers({ "x-api-key": "valid" }) },
    });
    const result = await client.read();
    expect(result.userId).toBe("api-user");
  });

  it("requests read permissions for the read procedure", async () => {
    mockAuthenticateApiKeyHeaders.mockResolvedValue({
      userId: "u",
      keyId: "k",
      name: null,
    });
    const client = createRouterClient(testRouter, {
      context: { headers: new Headers({ "x-api-key": "k" }) },
    });
    await client.read();
    expect(mockAuthenticateApiKeyHeaders).toHaveBeenCalledWith(expect.any(Headers), {
      resumes: ["read"],
    });
  });

  it("requests write permissions for the write procedure", async () => {
    mockAuthenticateApiKeyHeaders.mockResolvedValue({
      userId: "u",
      keyId: "k",
      name: null,
    });
    const client = createRouterClient(testRouter, {
      context: { headers: new Headers({ "x-api-key": "k" }) },
    });
    await client.write();
    expect(mockAuthenticateApiKeyHeaders).toHaveBeenCalledWith(expect.any(Headers), {
      resumes: ["write"],
    });
  });
});
