import "@tanstack/react-start/server-only";

import { chat, type ModelMessage, type StreamChunk, type AnyTextAdapter } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { serverEnv } from "@/lib/server-env";
import { createResumeAgenticServerClient } from "./resume-orpc-client.server";
import {
  cloneCurrentResumeToolDefinition,
  createResumeFromDocumentToolDefinition,
  getCurrentResumeDocumentToolDefinition,
  searchCurrentResumeBlocksToolDefinition,
  updateCurrentResumeDocumentToolDefinition,
} from "./resume-chat-tool-definitions";

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
    "- Prefer clone_current_resume before creating a tailored variant so the original resume remains intact.",
    "- You may create a new draft with clone_current_resume or create_resume_from_document when the user asks you to save a tailored draft.",
    "- After a successful clone_current_resume or create_resume_from_document call, briefly tell the user the draft is ready. Do not try to navigate the app; the UI will show a clickable resume card.",
    "- Use update_current_resume_document to apply targeted edits directly to the current resume. Always call get_current_resume_document first to load the full document, make your changes to the returned document, then pass the complete updated document to update_current_resume_document.",
    "- After any tool creates or updates resume data, continue naturally. The app refreshes affected client data from tool results.",
    "- Keep responses practical and specific.",
    "- If you provide JSON, it must be valid ResumeDocumentV1 JSON with no markdown fences.",
  ].join("\n\n");
}

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

export async function streamResumeAgentChat(input: {
  userId: string;
  resumeId: string;
  messages: ModelMessage[];
  jobDescription?: string;
  apiKey?: string;
  model?: string;
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

  const cloneCurrentResume = cloneCurrentResumeToolDefinition.server((toolInput) =>
    client.resumes.clone({
      sourceResumeId: input.resumeId,
      name: toolInput.name,
      description: toolInput.description,
      jobDescription: toolInput.jobDescription,
    }),
  );

  const createResumeFromDocument = createResumeFromDocumentToolDefinition.server((toolInput) =>
    client.resumes.createFromDocument(toolInput),
  );

  const updateCurrentResumeDocument = updateCurrentResumeDocumentToolDefinition.server(
    (toolInput) =>
      client.resumes.updateDocument({
        resumeId: input.resumeId,
        document: toolInput.document,
      }),
  );

  return chat({
    adapter: buildTextAdapter(input.apiKey, input.model),
    messages: input.messages as never,
    systemPrompts: [buildSystemPrompt(input.resumeId, input.jobDescription)],
    tools: [
      getCurrentResumeDocument,
      searchCurrentResumeBlocks,
      cloneCurrentResume,
      createResumeFromDocument,
      updateCurrentResumeDocument,
    ],
  });
}
