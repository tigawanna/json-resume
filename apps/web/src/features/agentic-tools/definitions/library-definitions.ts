import { toolDefinition } from "@tanstack/ai";
import {
  attachLibraryItemsToolInputSchema,
  attachLibraryItemsToolOutputSchema,
  rankLibraryForJobToolInputSchema,
  rankLibraryForJobToolOutputSchema,
  searchLibraryToolInputSchema,
  searchLibraryToolOutputSchema,
} from "../resume-tool-schemas";

export const searchLibraryToolDefinition = toolDefinition({
  name: "search_library",
  description:
    "Search one section of the user's library (every summary, experience, bullet, education, project, talk and skill they have saved, across all résumés). Each item says whether the target résumé already shows it.",
  inputSchema: searchLibraryToolInputSchema,
  outputSchema: searchLibraryToolOutputSchema,
  metadata: { title: "Search Library", annotations: { readOnlyHint: true } },
});

export const attachLibraryItemsToolDefinition = toolDefinition({
  name: "attach_library_items",
  description:
    "Put existing library items (ids from search_library or rank_library_for_job) on a résumé without rewriting them.",
  inputSchema: attachLibraryItemsToolInputSchema,
  outputSchema: attachLibraryItemsToolOutputSchema,
});

export const rankLibraryForJobToolDefinition = toolDefinition({
  name: "rank_library_for_job",
  description:
    "Find the library items that mention the most keywords of a job, skipping ones the résumé already shows. Use it to fill gaps before writing new content.",
  inputSchema: rankLibraryForJobToolInputSchema,
  outputSchema: rankLibraryForJobToolOutputSchema,
  metadata: { title: "Rank Library For Job", annotations: { readOnlyHint: true } },
});
