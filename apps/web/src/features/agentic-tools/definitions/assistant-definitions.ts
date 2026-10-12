import { toolDefinition } from "@tanstack/ai";
import {
  getPlaybookToolInputSchema,
  getPlaybookToolOutputSchema,
  undoLastAiChangeToolInputSchema,
  undoLastAiChangeToolOutputSchema,
  wrapUpToolInputSchema,
  wrapUpToolOutputSchema,
} from "../resume-tool-schemas";

export const getPlaybookToolDefinition = toolDefinition({
  name: "get_playbook",
  description:
    "Read the step-by-step tool order for a common workflow: edit_resume, pasted_job, tailored_copy, fill_from_library, import_resume or cover_letter. Call it when unsure which tools to chain.",
  inputSchema: getPlaybookToolInputSchema,
  outputSchema: getPlaybookToolOutputSchema,
  metadata: { title: "Get Playbook", annotations: { readOnlyHint: true } },
});

export const undoLastAiChangeToolDefinition = toolDefinition({
  name: "undo_last_ai_change",
  description:
    "Revert the most recent change you made with a write tool in this conversation. Call it again to step further back; rows the user edited since are left alone and reported as skipped.",
  inputSchema: undoLastAiChangeToolInputSchema,
  outputSchema: undoLastAiChangeToolOutputSchema,
  lazy: true,
});

export const wrapUpToolDefinition = toolDefinition({
  name: "wrap_up",
  description:
    "Close a reply that created, changed or compared résumés: a short summary for the user plus every résumé involved (created, edited, or used as inspiration), which the chat shows as links. Call it last and write nothing after it.",
  inputSchema: wrapUpToolInputSchema,
  outputSchema: wrapUpToolOutputSchema,
  metadata: { title: "Wrap Up", annotations: { readOnlyHint: true } },
});
