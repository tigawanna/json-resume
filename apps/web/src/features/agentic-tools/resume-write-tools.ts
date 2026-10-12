import { undoLastAiChangeToolDefinition } from "./definitions/assistant-definitions";
import { attachLibraryItemsToolDefinition } from "./definitions/library-definitions";
import {
  cloneResumeToolDefinition,
  createResumeToolDefinition,
  tailorResumeForJobToolDefinition,
} from "./definitions/resume-definitions";
import {
  removeFromResumeToolDefinition,
  reorderSectionToolDefinition,
  replaceResumeDocumentToolDefinition,
  setContactsToolDefinition,
  setExperienceBulletsToolDefinition,
  setLinksToolDefinition,
  setNotesToolDefinition,
  setSkillsToolDefinition,
  setSummaryToolDefinition,
  updateResumeDetailsToolDefinition,
  upsertEducationToolDefinition,
  upsertExperienceToolDefinition,
  upsertProjectToolDefinition,
  upsertTalkToolDefinition,
} from "./definitions/resume-edit-definitions";

/** Tools whose writes change what a résumé's PDF shows (job tracker writes don't). */
export const resumeWriteToolNames: ReadonlySet<string> = new Set(
  [
    updateResumeDetailsToolDefinition,
    setSummaryToolDefinition,
    setExperienceBulletsToolDefinition,
    setSkillsToolDefinition,
    removeFromResumeToolDefinition,
    upsertExperienceToolDefinition,
    upsertProjectToolDefinition,
    upsertEducationToolDefinition,
    upsertTalkToolDefinition,
    reorderSectionToolDefinition,
    setContactsToolDefinition,
    setLinksToolDefinition,
    setNotesToolDefinition,
    replaceResumeDocumentToolDefinition,
    attachLibraryItemsToolDefinition,
    cloneResumeToolDefinition,
    createResumeToolDefinition,
    tailorResumeForJobToolDefinition,
    undoLastAiChangeToolDefinition,
  ].map((definition) => definition.name),
);
