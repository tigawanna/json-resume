import { Logger, Injectable } from "@nestjs/common";
import { DEFAULT_AI_ROUTING, modelAuthor, type AiRouting } from "@repo/isomorphic/agentic/routing";
import {
  chat,
  maxIterations,
  type ChatMiddleware,
  type chatParamsFromRequestBody,
  type StreamChunk,
  type TokenUsage,
  type Tool,
} from "@tanstack/ai";
import { withCompaction, type CompactionOptions } from "@tanstack/ai-compaction";
import type { OpenRouterSystemPromptMetadata } from "@tanstack/ai-openrouter";
import { buildOpenRouterModelOptions, buildTextAdapter } from "./openrouter-adapter.js";

const EXPLICIT_CACHE_AUTHORS = new Set(["anthropic", "google"]);

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
    agent: string;
    systemPrompt: string;
    tools: ReadonlyArray<Tool>;
    maxIterations: number;
    compaction?: CompactionOptions;
    frontendOrigin: string;
    abortController: AbortController;
  };

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

function usageLogMiddleware({
  fields,
  logger,
}: {
  fields: { agent: string; model: string; userId: string; routing: AiRouting };
  logger: Logger;
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
      logger.log(
        JSON.stringify({
          message: "AI model call finished",
          aiRun: {
            ...aiRun,
            threadId: ctx.threadId,
            iteration: ctx.iteration,
            ...usageFields(usage),
          },
        }),
      );
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
        logger.warn(
          JSON.stringify({
            message: "AI run hit the output token cap; the reply was truncated",
            aiRun: fieldsForRun,
          }),
        );
        return;
      }
      logger.log(JSON.stringify({ message: "AI run finished", aiRun: fieldsForRun }));
    },
  };
}

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger("AI");

  streamAgentChat(input: StreamAgentChatInput): AsyncIterable<StreamChunk> {
    const model = input.model ?? "";
    const routing = input.routing ?? DEFAULT_AI_ROUTING;
    const middleware: ChatMiddleware[] = [
      usageLogMiddleware({
        fields: { agent: input.agent, model, userId: input.userId, routing },
        logger: this.logger,
      }),
    ];
    if (input.compaction) {
      const compaction = input.compaction;
      middleware.push(
        withCompaction({
          ...compaction,
          onCompact: (info) => {
            this.logger.log(
              JSON.stringify({
                message: "AI context compacted",
                aiCompaction: {
                  agent: input.agent,
                  threadId: input.threadId,
                  maxTokens: compaction.maxTokens,
                  ...info,
                },
              }),
            );
            compaction.onCompact?.(info);
          },
        }),
      );
    }
    return chat({
      adapter: buildTextAdapter({
        apiKey: input.apiKey,
        model: input.model,
        frontendOrigin: input.frontendOrigin,
      }),
      messages: input.messages,
      threadId: input.threadId,
      runId: input.runId,
      parentRunId: input.parentRunId,
      resume: input.resume,
      abortController: input.abortController,
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
      modelOptions: buildOpenRouterModelOptions({
        routing,
        threadId: input.threadId,
        userId: input.userId,
      }),
      tools: [...input.tools],
      lazyToolsConfig: { includeDescription: "first-sentence" },
      agentLoopStrategy: maxIterations(input.maxIterations),
      middleware,
    });
  }
}
