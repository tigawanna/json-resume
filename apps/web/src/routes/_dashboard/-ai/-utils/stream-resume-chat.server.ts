import "@tanstack/react-start/server-only";

import {
  chat,
  maxIterations,
  type AnyTextAdapter,
  type ChatMiddleware,
  type chatParamsFromRequestBody,
  type StreamChunk,
  type TokenUsage,
} from "@tanstack/ai";
import {
  createOpenRouterText,
  type OpenRouterSystemPromptMetadata,
  type OpenRouterTextModelOptions,
} from "@tanstack/ai-openrouter";
import { log } from "evlog";
import { serverEnv } from "@/lib/server-env";
import { chatToolDefinitions } from "@/features/agentic-tools/definitions/chat-tool-definitions";
import {
  buildProviderPreferences,
  DEFAULT_AI_ROUTING,
  modelAuthor,
  type AiRouting,
} from "@/features/agentic-tools/openrouter-routing";
import { buildEventSourcedSystemPrompt, type ActiveJobContext } from "./system-prompt";

/** Enough model turns for the job description to tailored résumé chain (about 6 to 9 tool calls). */
const MAX_AGENT_ITERATIONS = 16;

/** Labs whose OpenRouter routes need an explicit `cache_control` breakpoint; the rest cache implicitly. */
const EXPLICIT_CACHE_AUTHORS = new Set(["anthropic", "google"]);

/**
 * The model id is cast on purpose (approved): `createOpenRouterText` only types the
 * package's bundled model list, but the picker offers OpenRouter's live list and
 * LM Studio accepts any local id.
 */
function buildTextAdapter(apiKey: string | undefined, model: string | undefined): AnyTextAdapter {
  if (serverEnv.LMSTUDIO_BASE_URL) {
    const lmModel = serverEnv.LMSTUDIO_MODEL ?? "gemma-3-12b-it";
    return createOpenRouterText(lmModel as never, "lm-studio", {
      serverURL: serverEnv.LMSTUDIO_BASE_URL,
    }) as unknown as AnyTextAdapter;
  }

  if (!apiKey || !model) {
    throw new Error("apiKey and model are required when not using a local LM Studio server");
  }

  return createOpenRouterText(model as never, apiKey, {
    httpReferer: serverEnv.FRONTEND_URL,
  }) as unknown as AnyTextAdapter;
}

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
  model: string;
  userId: string;
  routing: AiRouting;
}): ChatMiddleware {
  const aiRun = {
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
type ChatRunParams = Pick<
  Awaited<ReturnType<typeof chatParamsFromRequestBody>>,
  "messages" | "threadId" | "runId" | "parentRunId" | "resume"
>;

export async function streamEventSourcedResumeAgentChat(
  input: ChatRunParams & {
    resumeId: string;
    userId: string;
    activeResumeId?: string;
    activeJob?: ActiveJobContext;
    systemPrompt?: string;
    apiKey?: string;
    model?: string;
    routing?: AiRouting;
  },
): Promise<AsyncIterable<StreamChunk>> {
  const isOpenRouter = !serverEnv.LMSTUDIO_BASE_URL;
  const model = input.model ?? "";
  const routing = input.routing ?? DEFAULT_AI_ROUTING;

  const systemPrompt = buildEventSourcedSystemPrompt({
    instructions: input.systemPrompt ?? "",
    resumeId: input.resumeId,
    activeResumeId: input.activeResumeId,
    activeJob: input.activeJob,
  });

  const modelOptions: OpenRouterTextModelOptions | undefined = isOpenRouter
    ? {
        provider: buildProviderPreferences(routing),
        ...(routing.maxOutputTokens && { maxCompletionTokens: routing.maxOutputTokens }),
        sessionId: input.threadId.slice(0, 128),
        user: input.userId,
      }
    : undefined;

  return chat({
    adapter: buildTextAdapter(input.apiKey, input.model),
    messages: input.messages,
    threadId: input.threadId,
    runId: input.runId,
    parentRunId: input.parentRunId,
    resume: input.resume,
    systemPrompts: [
      isOpenRouter && EXPLICIT_CACHE_AUTHORS.has(modelAuthor(model))
        ? {
            content: systemPrompt,
            metadata: {
              cache_control: { type: "ephemeral" },
            } satisfies OpenRouterSystemPromptMetadata,
          }
        : systemPrompt,
    ],
    modelOptions,
    tools: [...chatToolDefinitions],
    lazyToolsConfig: { includeDescription: "first-sentence" },
    agentLoopStrategy: maxIterations(MAX_AGENT_ITERATIONS),
    middleware: isOpenRouter
      ? [usageLogMiddleware({ model, userId: input.userId, routing })]
      : undefined,
  });
}
