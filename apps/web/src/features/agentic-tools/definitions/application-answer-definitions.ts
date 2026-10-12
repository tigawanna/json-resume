import { toolDefinition } from "@tanstack/ai";
import {
  saveApplicationAnswersToolInputSchema,
  saveApplicationAnswersToolOutputSchema,
  searchApplicationAnswersToolInputSchema,
  searchApplicationAnswersToolOutputSchema,
} from "../application-answer-tool-schemas";

export const saveApplicationAnswersToolDefinition = toolDefinition({
  name: "save_application_answers",
  description:
    "Save questions from a job application form with draft answers, linked to a résumé and its job. Pass every question in one call; pass answerId to revise a saved answer. The chat shows the answers with copy buttons, so do not repeat them in your reply.",
  inputSchema: saveApplicationAnswersToolInputSchema,
  outputSchema: saveApplicationAnswersToolOutputSchema,
});

export const searchApplicationAnswersToolDefinition = toolDefinition({
  name: "search_application_answers",
  description:
    "Search answers the user wrote for earlier job applications, to reuse their stories and facts. Use one or two topic words per search (e.g. latency, conflict, mentoring), newest first.",
  inputSchema: searchApplicationAnswersToolInputSchema,
  outputSchema: searchApplicationAnswersToolOutputSchema,
  metadata: { title: "Search Application Answers", annotations: { readOnlyHint: true } },
});
