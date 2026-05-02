import { z } from "zod";
import { resumeDocumentV1Schema, type ResumeDocumentV1 } from "./resume-schema";

const resumeSectionItemShapesMarkdown = `## Section item shapes

The resume JSON below may show empty \`items\` or \`groups\` arrays. When you add or change entries, each object must use exactly these keys (no extras, no omissions):

- \`experience.items[]\`: \`company\`, \`role\`, \`start\`, \`end\`, optional \`location\`, \`bullets\` (string array)
- \`education.items[]\`: \`school\`, \`degree\`, optional \`field\`, \`year\`, optional \`bullets\` (string array)
- \`projects.items[]\`: \`name\`, \`url\`, optional \`homepageUrl\`, \`description\`, \`tech\` (string array)
- \`talks.items[]\`: \`title\`, \`event\`, \`date\` (strings), \`links\` (array of \`{ "label": string, "url": string }\`). Set \`talks.enabled\` to \`true\` when the talks section should render.
- \`skills.groups[]\`: \`name\`, \`items\` (string array)`;

export function buildSchemaPrompt(): string {
  const jsonSchema = z.toJSONSchema(resumeDocumentV1Schema);
  const schemaJson = JSON.stringify(jsonSchema, null, 2);

  return `The resume JSON must conform exactly to this JSON Schema (version 1).
Return ONLY valid JSON matching this structure — no markdown fences, no explanation.

## JSON Schema

\`\`\`json
${schemaJson}
\`\`\`

## Rules
- Do NOT add or remove top-level keys.
- Each experience bullet must be a separate string in the \`bullets\` array.
- \`sectionOrder\` controls render order — only use the keys listed in its \`enum\`.
- Keep \`version\` as \`1\`.`;
}

export function buildTailorPrompt(
  baseResume: ResumeDocumentV1,
  jobDescription: string,
  pastedPlainResume?: string,
): string {
  const resumeJson = JSON.stringify(baseResume, null, 2);
  const plain = pastedPlainResume?.trim();

  const instructionBlock = plain
    ? `1. Read my resume plain text, the starter JSON below, and the job description carefully.
2. Produce one tailored resume JSON that matches the starter JSON schema exactly. Use the plain text as the primary source of truth for employers, titles, dates, skills, and bullets; replace placeholder or sample content in the JSON with facts from the plain text where they apply.
3. Tailor aggressively to the job: merge or split bullet strings in \`experience.items[].bullets\` as needed; remove bullets that do not help this role; reorder bullets so the strongest matches come first; you may concatenate related wins into one bullet or break an overloaded bullet into several short bullets.
4. Map job keywords into the JSON where honest: if the posting asks for tools or skills that are a reasonable adjacent inference from my background (for example React state management when I list React and data-fetching libraries), you may add those keywords to bullets or skills without asking me to confirm.
5. Each experience bullet in the output must be a single string in the \`bullets\` array (one bullet per array entry). Do not put newline-separated lists inside one string; use multiple array entries instead.
6. Do NOT change the JSON structure. The output must be valid JSON that matches the exact same schema as the starter JSON.
7. Do NOT add new fields or remove existing ones.
8. Keep \`version\`, \`meta\`, and \`sectionOrder\` unchanged unless reordering sections makes sense for the role.
9. Return ONLY the JSON — no markdown fences, no explanation, just raw JSON.`
    : `1. Read my current resume JSON and the job description carefully.
2. Tailor the resume content to match the job requirements — adjust bullets, reorder sections, emphasize relevant skills, and tweak the summary.
3. Tailor aggressively: merge or split bullets in \`experience.items[].bullets\` as needed; remove weak bullets; reorder for relevance; add honest adjacent keywords inferred from my stack when the job asks for related tools.
4. Each experience bullet must be one string per \`bullets\` array entry (no multi-line bullet blobs in a single string).
5. Do NOT change the JSON structure. The output must be valid JSON that matches the exact same schema as the input.
6. Do NOT add new fields or remove existing ones.
7. Keep \`version\`, \`meta\`, and \`sectionOrder\` unchanged unless reordering sections makes sense for the role.
8. Return ONLY the JSON — no markdown fences, no explanation, just raw JSON.`;

  const plainSection = plain
    ? `

## My resume (plain text)

The following is copied from an existing resume (for example exported from a PDF). Use it as the factual source when filling the schema.

${plain}
`
    : "";

  return `I need you to tailor my resume for a specific job posting. Below is my resume material and the job description I'm targeting.

## Instructions

${instructionBlock}

${resumeSectionItemShapesMarkdown}

## ${plain ? "Starter resume (JSON)" : "My current resume (JSON)"}

${plain ? "Use this JSON for structure and schema only; prefer the plain-text resume for factual content." : "This is the resume to tailor — keep the same schema in your output."}

${resumeJson}
${plainSection}
## Job Description

${jobDescription}

## Output

Return the tailored resume as raw JSON (same schema as above):`;
}
