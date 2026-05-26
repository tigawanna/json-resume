import "@tanstack/react-start/server-only";

import { chat, type AnyTextAdapter, type ModelMessage, type StreamChunk } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { serverEnv } from "@/lib/server-env";
import { createResumeAgenticServerClient } from "./resume-orpc-client.server";
import {
  clonePersonaResumeToolDefinition,
  createPersonaResumeFromDocumentToolDefinition,
  getPersonaResumeDocumentToolDefinition,
  listPersonaResumesToolDefinition,
  searchPersonaResumeBlocksToolDefinition,
} from "./persona-chat-tool-definitions";

function buildPersonaSystemPrompt(): string {
  return [
    "You are Persona Writer, a dashboard-wide assistant for a developer-focused resume and personal branding workspace.",
    "Your job is to help the user write grounded, ready-to-paste material from their saved persona data: cover letters, emails, freelance proposals, social DMs, WhatsApp messages, profile bios, event descriptions, positioning copy, and new resume drafts.",
    "Available formats include formal letter, email, freelance proposal, Reddit DM, Twitter/X DM, LinkedIn message, WhatsApp message, short bio, project description, and resume draft.",
    "Rules:",
    "- Ground claims in data loaded with tools. Search broadly first when the user asks for writing based on their background.",
    "- Never invent employers, titles, dates, degrees, projects, metrics, or technologies.",
    "- If the target post, audience, or channel is missing, ask one concise clarifying question or provide a reusable draft with clear placeholders.",
    "- For proposals and messages, produce polished copy the user can paste directly. Keep explanation short unless asked.",
    "- Match the requested channel: letters can be structured and formal; email should have subject/body; DMs and WhatsApp should be shorter and more conversational.",
    "- When creating a new resume, use list_resumes, search_resume_blocks, and get_resume_document as needed, then call create_resume_from_document or clone_resume only when the user clearly asks to save a draft.",
    "- After creating or cloning a resume, briefly tell the user the draft is ready. The UI will expose the new resume in the app.",
    "- If you provide JSON manually, it must be valid ResumeDocumentV1 JSON with no markdown fences.",
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

export async function streamPersonaAgentChat(input: {
  userId: string;
  messages: ModelMessage[];
  apiKey?: string;
  model?: string;
}): Promise<AsyncIterable<StreamChunk>> {
  const client = createResumeAgenticServerClient(input.userId);

  const listResumes = listPersonaResumesToolDefinition.server((toolInput) =>
    client.resumes.list(toolInput),
  );

  const getResumeDocument = getPersonaResumeDocumentToolDefinition.server((toolInput) =>
    client.resumes.document(toolInput),
  );

  const searchResumeBlocks = searchPersonaResumeBlocksToolDefinition.server((toolInput) =>
    client.resumeBlocks.search(toolInput),
  );

  const cloneResume = clonePersonaResumeToolDefinition.server((toolInput) =>
    client.resumes.clone(toolInput),
  );

  const createResumeFromDocument = createPersonaResumeFromDocumentToolDefinition.server(
    (toolInput) => client.resumes.createFromDocument(toolInput),
  );

  return chat({
    adapter: buildTextAdapter(input.apiKey, input.model),
    messages: input.messages as never,
    systemPrompts: [buildPersonaSystemPrompt()],
    tools: [
      listResumes,
      getResumeDocument,
      searchResumeBlocks,
      cloneResume,
      createResumeFromDocument,
    ],
  });
}
