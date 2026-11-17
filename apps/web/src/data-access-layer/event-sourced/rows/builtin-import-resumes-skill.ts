import type { BuiltinAssistantSkill } from "./assistant-skill-rows";

const DESCRIPTION =
  "Turn pasted JSON, JSON Resume, PDF text, or several documents into résumés in this app. Attach this skill when importing a batch.";

const BODY = `# Rule
When the user pastes résumé JSON, JSON Resume, PDF text, or several documents, import them. Do not ask them to use the file picker unless they want to.

# What counts as an import
- One ResumeDocumentV1 object (\`version: 1\`, \`header\`, \`experience\`, …).
- An array of those objects.
- Several JSON objects in one message.
- JSON Resume (\`basics\`, \`work\`, \`education\`, \`skills\`). Map into ResumeDocumentV1. Drop fields we do not store. Invent nothing.
- Plain text or a PDF copy-paste: parse into one ResumeDocumentV1. Invent nothing.

# Dashboard
start_first_resume with \`documents\` (name + document per résumé). If they also want a blank starter and a paste, import the paste; do not skip it. After import, one short sentence. The app opens the last résumé.

# Editor
get_playbook import_resume. create_resume once per document. open_resume the last. wrap_up every new résumé as created.

# Portable recipe (for another chat)
If they need JSON first, tell them to attach this skill here, or paste this into another assistant with their PDF:

Convert each résumé into JSON the Cravfted app can import. Output only JSON, no markdown fences unless they ask.
Shape per résumé:
{"version":1,"meta":{"templateId":"classic"},"sectionOrder":["header","summary","experience","education","projects","talks","skills","notes"],"header":{"enabled":true,"fullName":"","headline":"","email":"","location":"","links":[]},"summary":{"enabled":true,"text":""},"experience":{"enabled":true,"items":[{"company":"","role":"","start":"","end":"","bullets":[]}]},"education":{"enabled":true,"items":[]},"projects":{"enabled":true,"items":[]},"talks":{"enabled":false,"items":[]},"skills":{"enabled":true,"groups":[{"name":"","items":[]}]},"notes":{"enabled":false,"label":"Notes","text":""}}
Rules: one object or an array. Copy every fact from the source. Never invent employers, dates, or metrics. Empty string when unknown. Then they paste that JSON into this chat.

# Do not
- Invent roles to fill gaps in a PDF.
- Import the Jordan Lee sample.
- Refuse because the paste is not a file.
`;

export const IMPORT_RESUMES_SKILL: BuiltinAssistantSkill = {
  id: "builtin-import-resumes",
  key: "import-resumes",
  name: "Import JSON résumés",
  description: DESCRIPTION,
  body: BODY,
  scopes: ["resume", "dashboard"],
};
