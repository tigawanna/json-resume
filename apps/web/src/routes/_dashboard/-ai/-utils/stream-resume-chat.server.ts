import "@tanstack/react-start/server-only";

import { chat, type AnyTextAdapter, type ModelMessage, type StreamChunk } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { serverEnv } from "@/lib/server-env";
import {
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  getCurrentResumeDocumentToolDefinition,
  navigateToResumeToolDefinition,
  refreshResumePreviewToolDefinition,
  searchCurrentResumeBlocksToolDefinition,
  updateCurrentResumeDocumentToolDefinition,
  saveJobToolDefinition,
  listJobsToolDefinition,
  attachJobToCurrentResumeToolDefinition,
} from "@/features/agentic-tools/resume-chat-tool-definitions";
import { listResumesToolDefinition } from "@/features/agentic-tools/definitions/resume-definitions";
import { buildEventSourcedSystemPrompt } from "./system-prompt";

const eventSourcedResumeAiToolDefinitions = [
  listResumesToolDefinition,
  getCurrentResumeDocumentToolDefinition,
  searchCurrentResumeBlocksToolDefinition,
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  updateCurrentResumeDocumentToolDefinition,
  refreshResumePreviewToolDefinition,
  navigateToResumeToolDefinition,
  saveJobToolDefinition,
  listJobsToolDefinition,
  attachJobToCurrentResumeToolDefinition,
] as const;

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

export async function streamEventSourcedResumeAgentChat(input: {
  resumeId: string;
  messages: ModelMessage[];
  jobDescription?: string;
  systemPrompt?: string;
  apiKey?: string;
  model?: string;
}): Promise<AsyncIterable<StreamChunk>> {
  return chat({
    adapter: buildTextAdapter(input.apiKey, input.model),
    messages: input.messages as never,
    systemPrompts: [
      buildEventSourcedSystemPrompt({
        instructions: input.systemPrompt ?? "",
        resumeId: input.resumeId,
        jobDescription: input.jobDescription,
      }),
    ],
    tools: [...eventSourcedResumeAiToolDefinitions],
  });
}
