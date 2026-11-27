import { toolDefinition } from "@tanstack/ai";
import {
  mutateCollectionToolInputSchema,
  mutateCollectionToolOutputSchema,
  queryCollectionToolInputSchema,
  queryCollectionToolOutputSchema,
  searchConversationsToolInputSchema,
  searchConversationsToolOutputSchema,
} from "../tool-schemas/assistant-data.ts";

const MUTATE_FIELDS = [
  "resumeExperience: company, role, startDate, endDate, location, sortOrder",
  "resumeEducation: school, degree, field, startDate, endDate, description, sortOrder",
  "resumeEducationBullet: educationId, text, sortOrder",
  "resumeSkillGroup: name, sortOrder",
  "resumeSkill: name, level, sortOrder",
  "resumeContact: type, value, label, sortOrder",
  "resumeProject: name, url, homepageUrl, description, tech, sortOrder",
  "resumeSummary: text, sortOrder",
  "resumeNote: label, text, sortOrder",
  "resumeLink: label, url, icon, sortOrder",
  "resumeLanguage: name, proficiency, sortOrder",
  "resumeCertification: name, issuer, date, url, sortOrder",
  "resumeVolunteer: organization, role, startDate, endDate, description, sortOrder",
  "resumeTalk: title, event, date, description, links, sortOrder",
  "savedProject: name, url, homepageUrl, description, tech",
  "job: company, title, description, url, location, payRate, status, notes",
  "coverLetter: title, body, resumeId, jobId",
  "applicationAnswer: question, answer, resumeId, jobId, sortOrder",
  "assistantSkill: name, body, scopes, isDefault",
].join("; ");

export const queryCollectionToolDefinition = toolDefinition({
  name: "query_collection",
  description:
    "Read rows from one library collection. Pass id for one row, or keyword with limit and offset to search. Never invent rows that this tool did not return.",
  inputSchema: queryCollectionToolInputSchema,
  outputSchema: queryCollectionToolOutputSchema,
  lazy: true,
  metadata: { title: "Query Collection", annotations: { readOnlyHint: true } },
});

export const mutateCollectionToolDefinition = toolDefinition({
  name: "mutate_collection",
  description: `Insert, update, or delete one library row after the user approves. Update sends only the fields that change. Experience bullets are not writable here. Fields: ${MUTATE_FIELDS}.`,
  inputSchema: mutateCollectionToolInputSchema,
  outputSchema: mutateCollectionToolOutputSchema,
  lazy: true,
  needsApproval: true,
  metadata: { title: "Change a row" },
});

export const searchConversationsToolDefinition = toolDefinition({
  name: "search_conversations",
  description:
    "Search this browser's other assistant conversations. You only have the current thread in front of you. Pass conversationId to read up to 12 messages from one of them. This does not switch the user's chat.",
  inputSchema: searchConversationsToolInputSchema,
  outputSchema: searchConversationsToolOutputSchema,
  metadata: { title: "Search Conversations", annotations: { readOnlyHint: true } },
});
