import "@tanstack/react-start/server-only";

import {
  buildProviderPreferences,
  DEFAULT_AI_ROUTING,
  modelAuthor,
  type AiRouting,
} from "@/lib/openrouter/routing";
import { serverEnv } from "@/lib/env/server-env";
import {
  chat,
  maxIterations,
  type AnyTextAdapter,
  type ChatMiddleware,
  type chatParamsFromRequestBody,
  type StreamChunk,
  type TokenUsage,
  type Tool,
} from "@tanstack/ai";
import { withCompaction, type CompactionOptions } from "@tanstack/ai-compaction";
import {
  createOpenRouterText,
  type OpenRouterConfig,
  type OpenRouterSystemPromptMetadata,
  type OpenRouterTextModelOptions,
} from "@tanstack/ai-openrouter";
import { log } from "evlog";

/** Labs whose OpenRouter routes need an explicit `cache_control` breakpoint; the rest cache implicitly. */
const EXPLICIT_CACHE_AUTHORS = new Set(["anthropic", "google"]);

/**
 * The model id is cast on purpose (approved): `createOpenRouterText` only types the
 * package's bundled model list, but the picker offers OpenRouter's live list.
 */
function buildTextAdapter(apiKey: string | undefined, model: string | undefined): AnyTextAdapter {
  if (!apiKey || !model) {
    throw new Error("apiKey and model are required");
  }

  return createOpenRouterText(model as never, apiKey, {
    httpReferer: serverEnv.FRONTEND_URL,
    retryCodes: RETRY_STATUS_CODES,
    retryConfig: RETRY_CONFIG,
  }) as unknown as AnyTextAdapter;
}

/** Rate limits, request timeouts and upstream outages are worth waiting out. */
const RETRY_STATUS_CODES = ["408", "429", "5XX"];

/**
 * The SDK waits for `Retry-After` when OpenRouter sends it, else backs off
 * (~0.5s, 2s, 6s, 10s, 16s, 22s, then 30s). Free models limit per minute, so
 * keep trying for a little over one. Only covers the request before streaming starts.
 */
const RETRY_CONFIG = {
  strategy: "backoff",
  backoff: { initialInterval: 2_000, maxInterval: 30_000, exponent: 1.5, maxElapsedTime: 75_000 },
  retryConnectionErrors: true,
} satisfies OpenRouterConfig["retryConfig"];

function usageFields(usage: TokenUsage | undefined) {
  if (!usage) return {};
  const cachedTokens = usage.promptTokensDetails?.cachedTokens ?? 0;
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    reasoningTokens: usage.completionTokensDetails?.reasoningTokens,
    cachedTokens,
    cacheWriteTokens: usage.promptTokensDetails?.cacheWriteTokens,
    cacheHitRatio: usage.promptTokens > 0 ? cachedTokens / usage.promptTokens : 0,
    costUsd: usage.cost,
  };
}

/** One log line per model call and one per run, so cost per turn includes cache hits. */
function usageLogMiddleware(fields: {
  agent: string;
  model: string;
  userId: string;
  routing: AiRouting;
}): ChatMiddleware {
  const aiRun = {
    agent: fields.agent,
    model: fields.model,
    userId: fields.userId,
    routingMode: fields.routing.mode,
    providers: fields.routing.providers,
    maxOutputTokens: fields.routing.maxOutputTokens,
  };
  return {
    name: "openrouter-usage-log",
    onUsage(ctx, usage) {
      log.info({
        message: "AI model call finished",
        aiRun: {
          ...aiRun,
          threadId: ctx.threadId,
          iteration: ctx.iteration,
          ...usageFields(usage),
        },
      });
    },
    onFinish(ctx, info) {
      const fieldsForRun = {
        ...aiRun,
        threadId: ctx.threadId,
        iterations: ctx.iteration + 1,
        finishReason: info.finishReason,
        durationMs: info.duration,
        ...usageFields(info.usage),
      };
      if (info.finishReason === "length") {
        log.warn({
          message: "AI run hit the output token cap; the reply was truncated",
          aiRun: fieldsForRun,
        });
        return;
      }
      log.info({ message: "AI run finished", aiRun: fieldsForRun });
    },
  };
}

/** The AG-UI run fields `chat()` needs to continue a run after a tool approval. */
export type ChatRunParams = Pick<
  Awaited<ReturnType<typeof chatParamsFromRequestBody>>,
  "messages" | "threadId" | "runId" | "parentRunId" | "resume"
>;

export type AgentModelSettings = {
  userId: string;
  apiKey?: string;
  model?: string;
  routing?: AiRouting;
};

export type StreamAgentChatInput = ChatRunParams &
  AgentModelSettings & {
    /** Names the agent in usage logs. */
    agent: string;
    systemPrompt: string;
    tools: ReadonlyArray<Tool>;
    maxIterations: number;
    /** Shrinks the history sent to the model once it passes `maxTokens`. */
    compaction?: CompactionOptions;
  };

export function streamAgentChat(input: StreamAgentChatInput): AsyncIterable<StreamChunk> {
  const model = input.model ?? "";
  const routing = input.routing ?? DEFAULT_AI_ROUTING;

  const modelOptions: OpenRouterTextModelOptions = {
    provider: buildProviderPreferences(routing),
    ...(routing.maxOutputTokens && { maxCompletionTokens: routing.maxOutputTokens }),
    sessionId: input.threadId.slice(0, 128),
    user: input.userId,
  };

  const middleware: ChatMiddleware[] = [
    usageLogMiddleware({ agent: input.agent, model, userId: input.userId, routing }),
  ];
  if (input.compaction) {
    const compaction = input.compaction;
    middleware.push(
      withCompaction({
        ...compaction,
        onCompact(info) {
          log.info({
            message: "AI context compacted",
            aiCompaction: {
              agent: input.agent,
              threadId: input.threadId,
              maxTokens: compaction.maxTokens,
              ...info,
            },
          });
          compaction.onCompact?.(info);
        },
      }),
    );
  }

  return chat({
    adapter: buildTextAdapter(input.apiKey, input.model),
    messages: input.messages,
    threadId: input.threadId,
    runId: input.runId,
    parentRunId: input.parentRunId,
    resume: input.resume,
    systemPrompts: [
      EXPLICIT_CACHE_AUTHORS.has(modelAuthor(model))
        ? {
            content: input.systemPrompt,
            metadata: {
              cache_control: { type: "ephemeral" },
            } satisfies OpenRouterSystemPromptMetadata,
          }
        : input.systemPrompt,
    ],
    modelOptions,
    tools: [...input.tools],
    lazyToolsConfig: { includeDescription: "first-sentence" },
    agentLoopStrategy: maxIterations(input.maxIterations),
    middleware: middleware.length > 0 ? middleware : undefined,
  });
}
