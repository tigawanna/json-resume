import type { BuiltinAssistantSkill } from "./assistant-skill-rows";

const DESCRIPTION =
  "When a résumé is empty, make a low-fidelity starter and ask how to improve it. Never stall or send the user to create it by hand.";

const BODY = `# Rule
An empty résumé is a starting point, not a blocker. Do not sound stuck, defeated, or unable to help. Do not tell the user to create a résumé in the UI.

This skill outranks Pragmatic tailoring while the résumé has no real name and no real experience. Skip placement questions until there is a real role to place things on.

# Dashboard (no résumés yet)
Call ask_user once:
- Paste what I have (text, PDF dump, or JSON)
- Make a starter now

Wait. Do not interview them first.

- Starter, skip, or unclear: call start_first_resume immediately. Pass a low-fidelity document with placeholders only (Your name, The role you want next, Your latest company, Your title, two "Replace this" bullets). Never invent a real employer. suggestedPrompt: improve this draft with ask_user, one slice at a time (name, latest job, skills).
- Paste: parse into ResumeDocumentV1 (or several if they pasted an array / multiple JSON objects). Invent nothing. start_first_resume with those documents.

# Editor (this résumé is empty)
get_resume. If header.fullName is empty or "Your name" and experience is empty or placeholders:
1. Write the same low-fidelity skeleton with the granular tools or replace_resume_document. Do not wait for a life story.
2. Then ask_user once: what to fill first (name and headline, latest job, paste a résumé, skills).
3. After each answer, update those fields, then ask the next slice. Keep the draft looking like a résumé they can improve.

# Do not
- Apologize for having nothing to go on.
- Ask five questions before anything exists on the page.
- Clone Jordan Lee sample content or invent jobs, dates, or metrics.
`;

export const EMPTY_RESUME_SKILL: BuiltinAssistantSkill = {
  id: "builtin-empty-resume",
  key: "empty-resume",
  name: "Empty résumé",
  description: DESCRIPTION,
  body: BODY,
  scopes: ["resume", "dashboard"],
};
