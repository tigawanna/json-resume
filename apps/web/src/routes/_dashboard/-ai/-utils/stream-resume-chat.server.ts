import "@tanstack/react-start/server-only";

import {
  chat,
  maxIterations,
  type AnyTextAdapter,
  type chatParamsFromRequestBody,
  type StreamChunk,
} from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { serverEnv } from "@/lib/server-env";
import { chatToolDefinitions } from "@/features/agentic-tools/definitions/chat-tool-definitions";
import { buildEventSourcedSystemPrompt, type ActiveJobContext } from "./system-prompt";

/** Enough model turns for the job description to tailored résumé chain (about 6 to 9 tool calls). */
const MAX_AGENT_ITERATIONS = 16;

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

/** The AG-UI run fields `chat()` needs to continue a run after a tool approval. */
type ChatRunParams = Pick<
  Awaited<ReturnType<typeof chatParamsFromRequestBody>>,
  "messages" | "threadId" | "runId" | "parentRunId" | "resume"
>;

export async function streamEventSourcedResumeAgentChat(
  input: ChatRunParams & {
    resumeId: string;
    activeResumeId?: string;
    activeJob?: ActiveJobContext;
    systemPrompt?: string;
    apiKey?: string;
    model?: string;
  },
): Promise<AsyncIterable<StreamChunk>> {
  return chat({
    adapter: buildTextAdapter(input.apiKey, input.model),
    messages: input.messages,
    threadId: input.threadId,
    runId: input.runId,
    parentRunId: input.parentRunId,
    resume: input.resume,
    systemPrompts: [
      buildEventSourcedSystemPrompt({
        instructions: input.systemPrompt ?? "",
        resumeId: input.resumeId,
        activeResumeId: input.activeResumeId,
        activeJob: input.activeJob,
      }),
    ],
    tools: [...chatToolDefinitions],
    lazyToolsConfig: { includeDescription: "first-sentence" },
    agentLoopStrategy: maxIterations(MAX_AGENT_ITERATIONS),
  });
}
