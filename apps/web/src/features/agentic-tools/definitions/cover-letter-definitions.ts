import { toolDefinition } from "@tanstack/ai";
import {
  getCoverLetterToolInputSchema,
  getCoverLetterToolOutputSchema,
  listCoverLettersToolInputSchema,
  listCoverLettersToolOutputSchema,
  saveCoverLetterToolInputSchema,
  saveCoverLetterToolOutputSchema,
} from "../cover-letter-tool-schemas";

export const saveCoverLetterToolDefinition = toolDefinition({
  name: "save_cover_letter",
  description:
    "Save a cover letter, linked to a résumé and its job. Cover letters are optional: write one only when the user asks. Pass coverLetterId with the whole new body to revise a letter. The chat shows the saved letter with preview, copy and PDF actions, so do not paste it into your reply.",
  inputSchema: saveCoverLetterToolInputSchema,
  outputSchema: saveCoverLetterToolOutputSchema,
});

export const getCoverLetterToolDefinition = toolDefinition({
  name: "get_cover_letter",
  description:
    "Read a saved cover letter's full text, for example one the user referenced as inspiration. Omit coverLetterId to read the newest letter for a résumé (the active one by default).",
  inputSchema: getCoverLetterToolInputSchema,
  outputSchema: getCoverLetterToolOutputSchema,
  metadata: { title: "Get Cover Letter", annotations: { readOnlyHint: true } },
});

export const listCoverLettersToolDefinition = toolDefinition({
  name: "list_cover_letters",
  description:
    "Search the user's saved cover letters, most recently updated first, optionally only those for one résumé.",
  inputSchema: listCoverLettersToolInputSchema,
  outputSchema: listCoverLettersToolOutputSchema,
  metadata: { title: "List Cover Letters", annotations: { readOnlyHint: true } },
  lazy: true,
});
