import { toolDefinition } from "@tanstack/ai";
import {
  getPlaybookToolInputSchema,
  getPlaybookToolOutputSchema,
  undoLastAiChangeToolInputSchema,
  undoLastAiChangeToolOutputSchema,
} from "../resume-tool-schemas";

export const getPlaybookToolDefinition = toolDefinition({
  name: "get_playbook",
  description:
    "Read the step-by-step tool order for a common workflow: edit_resume, pasted_job, tailored_copy, fill_from_library or import_resume. Call it when unsure which tools to chain.",
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
