// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server-only", () => ({}));

const mockVerifyApiKey = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      verifyApiKey: (...args: unknown[]) => mockVerifyApiKey(...args),
    },
  },
}));

import {
  readApiKeyFromHeaders,
  authenticateApiKeyHeaders,
  authenticateApiKeyRequest,
} from "./api-key.server";

describe("readApiKeyFromHeaders", () => {
  it("extracts key from x-api-key header", () => {
    const headers = new Headers({ "x-api-key": "test-key-123" });
    expect(readApiKeyFromHeaders(headers)).toBe("test-key-123");
  });

  it("extracts key from Authorization Bearer header", () => {
    const headers = new Headers({ authorization: "Bearer bearer-key-456" });
    expect(readApiKeyFromHeaders(headers)).toBe("bearer-key-456");
  });

  it("prefers x-api-key over Authorization Bearer", () => {
    const headers = new Headers({
      "x-api-key": "explicit-key",
      authorization: "Bearer bearer-key",
    });
    expect(readApiKeyFromHeaders(headers)).toBe("explicit-key");
  });

  it("returns null when no key is present", () => {
    expect(readApiKeyFromHeaders(new Headers())).toBeNull();
  });

  it("returns null for non-Bearer authorization schemes", () => {
    const headers = new Headers({ authorization: "Basic dXNlcjpwYXNz" });
    expect(readApiKeyFromHeaders(headers)).toBeNull();
  });

  it("trims whitespace from x-api-key", () => {
    const headers = new Headers({ "x-api-key": "  spaced-key  " });
    expect(readApiKeyFromHeaders(headers)).toBe("spaced-key");
  });
});

describe("authenticateApiKeyHeaders", () => {
  beforeEach(() => {
    mockVerifyApiKey.mockReset();
  });

  it("returns null when headers contain no key", async () => {
    const result = await authenticateApiKeyHeaders(new Headers());
    expect(result).toBeNull();
    expect(mockVerifyApiKey).not.toHaveBeenCalled();
  });

  it("returns null when verifyApiKey reports the key as invalid", async () => {
    mockVerifyApiKey.mockResolvedValue({ valid: false, key: null });
    const headers = new Headers({ "x-api-key": "bad-key" });
    expect(await authenticateApiKeyHeaders(headers)).toBeNull();
  });

  it("returns null when valid key has no referenceId", async () => {
    mockVerifyApiKey.mockResolvedValue({
      valid: true,
      key: { id: "key-1", name: "test", referenceId: null },
    });
    const headers = new Headers({ "x-api-key": "orphan-key" });
    expect(await authenticateApiKeyHeaders(headers)).toBeNull();
  });

  it("returns auth result for a valid key with referenceId", async () => {
    mockVerifyApiKey.mockResolvedValue({
      valid: true,
      key: { id: "key-1", name: "My Key", referenceId: "user-123" },
    });
    const headers = new Headers({ "x-api-key": "good-key" });
    expect(await authenticateApiKeyHeaders(headers)).toEqual({
      userId: "user-123",
      keyId: "key-1",
      name: "My Key",
    });
  });

  it("forwards the requested permissions to verifyApiKey", async () => {
    mockVerifyApiKey.mockResolvedValue({ valid: false, key: null });
    const headers = new Headers({ "x-api-key": "any-key" });
    await authenticateApiKeyHeaders(headers, { resumes: ["read"] });
    expect(mockVerifyApiKey).toHaveBeenCalledWith({
      body: { key: "any-key", permissions: { resumes: ["read"] } },
    });
  });
});

describe("authenticateApiKeyRequest", () => {
  beforeEach(() => {
    mockVerifyApiKey.mockReset();
  });

  it("returns null when the request carries no API key", async () => {
    const request = new Request("https://example.com", { method: "POST" });
    expect(await authenticateApiKeyRequest(request)).toBeNull();
    expect(mockVerifyApiKey).not.toHaveBeenCalled();
  });

  it("delegates to verifyApiKey when an API key is present", async () => {
    mockVerifyApiKey.mockResolvedValue({
      valid: true,
      key: { id: "key-1", name: "Key", referenceId: "user-1" },
    });
    const request = new Request("https://example.com", {
      method: "POST",
      headers: { "x-api-key": "valid-key" },
    });
    const result = await authenticateApiKeyRequest(request);
    expect(result).toEqual({ userId: "user-1", keyId: "key-1", name: "Key" });
  });
});
