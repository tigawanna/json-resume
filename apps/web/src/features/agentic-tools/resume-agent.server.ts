import "@tanstack/react-start/server-only";

import {
  chat,
  toolDefinition,
  type ModelMessage,
  type StreamChunk,
  type AnyTextAdapter,
} from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import type { OpenRouterModel } from "./openrouter-models";
import { serverEnv } from "@/lib/server-env";
import { z } from "zod";
import { createResumeAgenticServerClient } from "./resume-orpc-client.server";
import {
  createResumeFromDocumentToolInputSchema,
  createResumeFromDocumentToolOutputSchema,
  getResumeDocumentToolOutputSchema,
  resumeBlockTypeSchema,
  searchResumeBlocksToolOutputSchema,
} from "./resume-tool-schemas";

const searchCurrentResumeBlocksInputSchema = z.object({
  keyword: z.string().trim().min(1).optional(),
  blockTypes: z.array(resumeBlockTypeSchema).min(1).optional(),
  limitPerType: z.coerce.number().int().min(1).max(20).default(8),
});

const getCurrentResumeDocumentToolDefinition = toolDefinition({
  name: "get_current_resume_document",
  description:
    "Load the current working resume as structured ResumeDocumentV1 JSON before tailoring or giving specific rewrite advice.",
  outputSchema: getResumeDocumentToolOutputSchema,
});

const searchCurrentResumeBlocksToolDefinition = toolDefinition({
  name: "search_current_resume_blocks",
  description:
    "Search summaries, experience bullets, projects, and skills from the current resume using keywords from the target role.",
  inputSchema: searchCurrentResumeBlocksInputSchema,
  outputSchema: searchResumeBlocksToolOutputSchema,
});

const saveTailoredResumeDraftToolDefinition = toolDefinition({
  name: "save_tailored_resume_draft",
  description:
    "Create a new saved resume draft from a complete ResumeDocumentV1. Use this only when the user explicitly asks to save or create a draft.",
  inputSchema: createResumeFromDocumentToolInputSchema,
  outputSchema: createResumeFromDocumentToolOutputSchema,
});

function buildSystemPrompt(resumeId: string, jobDescription: string | undefined): string {
  return [
    "You are an expert resume tailoring assistant for a developer-focused JSON resume editor.",
    `The current resume id is "${resumeId}".`,
    jobDescription?.trim()
      ? `The currently saved job description is:\n${jobDescription.trim()}`
      : "There is no saved job description yet. Ask for one or work from the user's latest message.",
    "Rules:",
    "- Ground your advice in the resume data you load with tools.",
    "- Never invent employers, titles, projects, dates, or metrics.",
    "- Use search_current_resume_blocks when you need relevant bullets or skills for a target role.",
    "- Use save_tailored_resume_draft only after the user clearly asks to save a new draft.",
    "- Keep responses practical and specific.",
    "- If you provide JSON, it must be valid ResumeDocumentV1 JSON with no markdown fences.",
  ].join("\n\n");
}

function buildTextAdapter(
  apiKey: string | undefined,
  model: OpenRouterModel | undefined,
): AnyTextAdapter {
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

export async function streamResumeAgentChat(input: {
  userId: string;
  resumeId: string;
  messages: ModelMessage[];
  jobDescription?: string;
  apiKey?: string;
  model?: OpenRouterModel;
}): Promise<AsyncIterable<StreamChunk>> {
  const client = createResumeAgenticServerClient(input.userId);

  const getCurrentResumeDocument = getCurrentResumeDocumentToolDefinition.server(async () =>
    client.resumes.document({ resumeId: input.resumeId }),
  );

  const searchCurrentResumeBlocks = searchCurrentResumeBlocksToolDefinition.server(
    async (toolInput) =>
      client.resumeBlocks.search({
        ...toolInput,
        resumeId: input.resumeId,
        keyword: toolInput.keyword,
      }),
  );

  const saveTailoredResumeDraft = saveTailoredResumeDraftToolDefinition.server(async (toolInput) =>
    client.resumes.createFromDocument(toolInput),
  );

  return chat({
    adapter: buildTextAdapter(input.apiKey, input.model),
    messages: input.messages as never,
    systemPrompts: [buildSystemPrompt(input.resumeId, input.jobDescription)],
    tools: [getCurrentResumeDocument, searchCurrentResumeBlocks, saveTailoredResumeDraft],
  });
}
