import { describe, expect, it } from "vitest";
import {
  buildOpenRouterModelOptions,
  buildProviderPreferences,
  buildTextAdapter,
} from "./openrouter-adapter.js";

describe("OpenRouter adapter", () => {
  it("requires parameters and only pins providers outside auto mode", () => {
    expect(
      buildProviderPreferences({
        mode: "auto",
        providers: [],
        allowFallbacks: true,
        sort: "throughput",
      }),
    ).toEqual({ requireParameters: true, sort: "throughput" });
    expect(
      buildProviderPreferences({
        mode: "official",
        providers: ["deepseek"],
        allowFallbacks: false,
      }),
    ).toEqual({ requireParameters: true, order: ["deepseek"], allowFallbacks: false });
  });

  it("passes routing, output cap, session, and user metadata", () => {
    expect(
      buildOpenRouterModelOptions({
        routing: {
          mode: "custom",
          providers: ["deepinfra", "deepseek"],
          allowFallbacks: true,
          maxOutputTokens: 8_192,
        },
        threadId: "thread-1234567890",
        userId: "user-1",
      }),
    ).toEqual({
      provider: {
        requireParameters: true,
        order: ["deepinfra", "deepseek"],
        allowFallbacks: true,
      },
      maxCompletionTokens: 8_192,
      sessionId: "thread-1234567890",
      user: "user-1",
    });
  });

  it("builds a BYOK OpenRouter adapter and fails closed without credentials", () => {
    expect(
      buildTextAdapter({
        apiKey: "test-key",
        model: "deepseek/deepseek-v4.1-flash-1017",
        frontendOrigin: "http://localhost:3040",
      }).name,
    ).toBe("openrouter");
    expect(() =>
      buildTextAdapter({
        apiKey: undefined,
        model: "deepseek/deepseek-v4.1-flash-1017",
        frontendOrigin: "http://localhost:3040",
      }),
    ).toThrow("apiKey and model are required");
  });
});
