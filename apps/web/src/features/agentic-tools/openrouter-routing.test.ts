import { describe, expect, it } from "vitest";
import type { OpenRouterModelEndpoint } from "@/types/openrouter";
import {
  AGENT_MAX_OUTPUT_TOKENS,
  aiRoutingSchema,
  availableOfficialSlugs,
  buildProviderPreferences,
  DEFAULT_AI_ROUTING,
  officialProviderSlugs,
  resolveRouting,
} from "./openrouter-routing";

function endpoint(
  tag: string,
  maxOutput: number | null,
  params: string[] = ["tools", "max_tokens"],
): OpenRouterModelEndpoint {
  return {
    name: tag,
    provider_name: tag,
    tag,
    context_length: 131_072,
    max_completion_tokens: maxOutput,
    quantization: null,
    pricing: { prompt: "0.000001", completion: "0.000002" },
    supported_parameters: params,
    status: 0,
  };
}

const deepseekEndpoints = [
  endpoint("deepinfra/fp8", 131_072),
  endpoint("deepseek", 8_192),
  endpoint("novita/fp8", 4_096, ["max_tokens"]),
];

describe("officialProviderSlugs", () => {
  it("maps model labs to their first-party OpenRouter slugs", () => {
    expect(officialProviderSlugs("deepseek/deepseek-v4.1-flash")).toEqual(["deepseek"]);
    expect(officialProviderSlugs("mistralai/mistral-medium-3.1")).toEqual(["mistral"]);
    expect(officialProviderSlugs("qwen/qwen3.8-max-prime")).toEqual(["alibaba"]);
    expect(officialProviderSlugs("~anthropic/claude-sonnet-latest")).toEqual(["anthropic"]);
  });

  it("only offers official slugs that actually serve the model", () => {
    expect(availableOfficialSlugs("deepseek/x", deepseekEndpoints)).toEqual(["deepseek"]);
    expect(availableOfficialSlugs("meta-llama/x", deepseekEndpoints)).toEqual([]);
  });
});

describe("resolveRouting", () => {
  it("locks official mode to the lab and caps output at the official endpoint", () => {
    const resolved = resolveRouting(
      "deepseek/x",
      { ...DEFAULT_AI_ROUTING, mode: "official", allowFallbacks: false },
      deepseekEndpoints,
      undefined,
    );
    expect(resolved).toMatchObject({ mode: "official", providers: ["deepseek"] });
    expect(resolved.maxOutputTokens).toBe(8_192);
  });

  it("caps auto mode at the agent ceiling and ignores endpoints without tool use", () => {
    const resolved = resolveRouting("deepseek/x", DEFAULT_AI_ROUTING, deepseekEndpoints, undefined);
    expect(resolved.providers).toEqual([]);
    expect(resolved.maxOutputTokens).toBe(AGENT_MAX_OUTPUT_TOKENS);
  });

  it("falls back to auto when nothing can be pinned", () => {
    const resolved = resolveRouting(
      "meta-llama/x",
      { ...DEFAULT_AI_ROUTING, mode: "official" },
      deepseekEndpoints,
      undefined,
    );
    expect(resolved.mode).toBe("auto");
  });

  it("produces a value the forwarded-props schema accepts", () => {
    const resolved = resolveRouting(
      "deepseek/x",
      { ...DEFAULT_AI_ROUTING, mode: "custom", providers: ["deepinfra", "deepseek"] },
      deepseekEndpoints,
      undefined,
    );
    expect(aiRoutingSchema.safeParse(resolved).success).toBe(true);
    expect(resolved.maxOutputTokens).toBe(8_192);
  });
});

describe("buildProviderPreferences", () => {
  it("always requires parameters and only pins providers outside auto mode", () => {
    expect(buildProviderPreferences({ ...DEFAULT_AI_ROUTING, sort: "throughput" })).toEqual({
      requireParameters: true,
      sort: "throughput",
    });
    expect(
      buildProviderPreferences({
        mode: "official",
        providers: ["deepseek"],
        allowFallbacks: false,
      }),
    ).toEqual({ requireParameters: true, order: ["deepseek"], allowFallbacks: false });
  });
});
