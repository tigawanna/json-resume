/* CRUD and shipped defaults for assistant skills, the instructions the résumé assistants follow. */
import type { AppDb } from "../collection";
import type { AssistantSkill, AssistantSkillScope } from "../schemas";
import { joinSearchable, libraryRowBase, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import {
  composeSkillMarkdown,
  parseSkillMarkdown,
  skillDocument,
} from "./assistant-skill-markdown";
import { EMPTY_RESUME_SKILL } from "./builtin-empty-resume-skill";
import { IMPORT_RESUMES_SKILL } from "./builtin-import-resumes-skill";

export const ASSISTANT_SKILL_SCOPES = ["resume", "experience", "dashboard"] as const;

/** A skill can be a long markdown file. The full page is for editing one this size. */
export const ASSISTANT_SKILL_BODY_MAX = 32_000;

const DEV_BULLETS_DESCRIPTION =
  "Write each bullet as one shipped change: verb, system, the stack that role actually used, and an outcome only when the source states one. Never adds a fact.";

const DEV_BULLETS_BODY = `# Rule
One bullet = one change that was shipped.
Strong verb + what changed in the system + the stack this role actually used + outcome (only if the source states one).

# Tense
- Current role: present tense.
- Past roles: past tense.
- No end date, or "Present": current. Ended role: past, even if recent.

# Form
- Name the system, service, or pipeline. A bullet with no named system is not a developer bullet.
- Lead with the verb. Drop "responsible for", "worked on", "helped with", "leveraged", "utilized", "assisted with".
- One change per line. Don't split one change across two bullets or merge two changes into one.
- Keep the user's own names for tools and products. Don't rename their stack to a trendier equivalent.
- No first person. Match the résumé's existing punctuation and capitalization.
- If a line could sit on anyone's résumé, ground it in a fact from this role or delete it.

# Facts
Rewording is allowed. New facts are not. Never add, move, or inflate:
- tools, skills, certifications, technologies
- metrics, percentages, dollar amounts, volumes
- dates, titles, employers, education
- team size, scope, seniority, ownership
- a metric from one bullet onto another

**Stack must match the role's dates.** A technology belongs in the line only if that role used it. Never move a later practice into an earlier job.

**Generative AI suggestions.** This is a filter on what you suggest, not a reason to delete lines the user typed.
- Block generative AI terms (LLMs, RAG, prompt engineering, AI agents, Copilot) on a role whose end date is before 2023.
- Allow traditional ML terms (machine learning, NLP, predictive modeling) when the user already wrote them.
- Judge by the role's end date, not its start. A role that started in 2021 and ended in 2024 can include generative AI the résumé already supports.
- Keep generative AI the user wrote themselves, including a pre-2023 role at an AI lab or company. Do not strip it.

**Outcomes:** include only when the source bullet already states one. If the original has no number, leave it unquantified. Do not invent, estimate, or round a metric.

**Verbs must match the work.** Don't upgrade "implemented" to "designed", "contributed to" to "led", or "maintained" to "owned".

# Output
Rewritten bullets, in order, plus:
- **Flags** — source lines that were generic, fact-thin, or claimed an outcome with no number.
- **Dropped** — lines deleted as unfixable, with the reason.

Never silently delete a bullet.

# Do not
- Add a stack the role didn't use.
- Add a metric the source doesn't state.
- Merge or split changes.
- Write a bullet that could belong to any developer.

# Examples
Source: "Responsible for working on the payments service, helped with performance."
→ "Rebuilt the payments service's retry path in Go." (Add an outcome only if the source names one.)

Source: "Utilized React to assist with the dashboard."
→ "Built the analytics dashboard in React."

Source: 2019 role; user learned Kubernetes in 2022.
→ No Kubernetes. Flag: "K8s predates this role's dates."

Source: role ended in 2021, and a suggestion adds "LLM" or "RAG".
→ Do not add it. Keep "machine learning" only if the user already wrote it.

Source: role started in 2021 and ended in 2024, and the résumé already shows Copilot or an AI feature.
→ Keep it. The end date is after 2022.

Source: the user wrote "LLM evaluation" on a 2021 research role.
→ Keep it. Do not delete what they typed.`;

const PRAGMATIC_TAILORING_DESCRIPTION =
  "Weave a posting requirement into a role only when the résumé already supports it. Returns edits, a change log, and a gap list. Never invents experience.";

const PREVIOUS_PLASTERED_PRAGMATIC_BODY = `# Rule
A requirement may be woven in only where the résumé already supports it. If nothing supports it, leave it out and report it as a gap.

# Boundary with Developer bullets
This skill decides what to weave and where. Developer bullets decides how the line reads and what counts as a fact, including the generative-AI cutoff. On any conflict about tense, stack-in-role, metrics, or verbs, Developer bullets wins. "Go all in" relaxes emphasis, never facts.

# Evidence levels
Classify each matched requirement before editing:
- **Direct** — the same skill, tool, domain, or responsibility already appears on the named experience. Adjust wording so the match is obvious.
- **Adjacent** — transferable evidence only (related tool, analogous responsibility, same domain). Propose the line, label it Adjacent, keep the claim modest. Don't upgrade to Direct by wording.
- **Unsupported** — no evidence. No edit. Gap list.

# Placement brief
The chat shows the guiding questions as a Placement brief card before the first edit: how far, which skill, which experience, and how the line should be written in. That card is the structured input. Do not ask those four questions in the reply, and do not call a tool to collect them.

A brief already in the conversation covers later messages. Follow it and start the work. Do not ask for a new one.

Fields:
- \`skill\`
- \`experience_id\` (IDs, not names, when available)
- \`insertion_note\` — how the line should read
- \`source_evidence\` — optional supporting bullet or skill

When present:
- Put the named skill on the named experience. Do not shop around for a different home.
- Use their note for how the line reads.
- A brief authorizes placement, not fabrication. If the named experience has no supporting evidence, stop, flag the conflict, and ask before editing.

# No Placement brief
Stop before any write tool. Tell the user to answer the Placement brief card, then wait. Do not offer your own experience list. The card already lists the résumé's skills and experiences.

# After the brief
- Edit where evidence is Direct.
- Propose, clearly labeled, where evidence is Adjacent.
- Do not edit Unsupported requirements; list them.
- Ask again only when the brief conflicts with the evidence, or a later change needs a home the brief did not name. Offer ranked experiences from the résumé plus Other. Never a bare "which experience?", and never the four brief questions again.

# Multiple homes
Prefer, in order: most recent → most relevant to the target role → strongest direct evidence. State the choice in the change log.

# Go all in
Only when the user explicitly says to tailor to the max and disregard realistic experience, or the brief says go all in.

Means: denser keyword alignment, leading with the most relevant evidence, more aggressive framing. Does not permit new tools, metrics, dates, titles, scope, or backdated stacks.

# Output
1. **Edits** — revised bullets or fields with experience IDs.
2. **Change log** — requirement → experience → evidence level → what changed.
3. **Gaps** — unsupported requirements, left out, with a one-line suggestion each ("add only if true", "omit", "cover in cover letter").
4. **Questions** — only for a brief conflict or a home the brief did not name.

Every requirement lands in edits, proposals, or gaps. Never silently drop one.

# Do not
- Stuff keywords or repeat a term unnaturally.
- Claim proficiency from a single mention.
- Strip useful general evidence to fit one posting.
- Treat "go all in" as permission to fabricate.

# Examples
Direct: "stakeholder management" ↔ "led weekly reviews with finance and ops" → "Managed stakeholders across finance and ops through weekly reviews."

Adjacent: "Kubernetes" ↔ "containerized services with Docker" → "Containerized services with Docker; working knowledge of orchestration." Label Adjacent.

Unsupported: "Terraform", no IaC evidence → gap only.

Brief conflict: brief puts "RAG" on a role that ended in 2016 with no generative-AI evidence → no edit; flag and ask. A "machine learning" line the user already wrote on that role stays.`;

const PRAGMATIC_TAILORING_BODY = `# Rule
A requirement may be woven in only where the résumé already supports it. If nothing supports it, leave it out and report it as a gap.

# Boundary with Developer bullets
This skill decides what to weave and where. Developer bullets decides how the line reads and what counts as a fact, including the generative-AI cutoff. On any conflict about tense, stack-in-role, metrics, or verbs, Developer bullets wins. "Go all in" relaxes emphasis, never facts.

# Evidence levels
Classify each matched requirement before editing:
- **Direct** — the same skill, tool, domain, or responsibility already appears on the named experience. Adjust wording so the match is obvious.
- **Adjacent** — transferable evidence only (related tool, analogous responsibility, same domain). Propose the line, label it Adjacent, keep the claim modest. Don't upgrade to Direct by wording.
- **Unsupported** — no evidence. No edit. Gap list.

# Placement questions
When you have the ask_user tool and a placement decision is not already answered in this thread, call it once per question and wait. Ask only what you cannot tell from the résumé. Typical questions, in order, and only the ones you still need: how far (keep it honest, or go all in), which skill, which experience (ids from get_resume, plus Other), how the line should be written in. Pass short choices. Do not ask those questions in prose, and do not ask several in one call.

An answer already in the thread covers later messages. Follow it and start the work. Do not ask again.

When an answer names a skill and an experience:
- Put the named skill on the named experience. Do not shop around for a different home.
- Use their note for how the line reads.
- An answer authorizes placement, not fabrication. If the named experience has no supporting evidence, stop, flag the conflict, and ask before editing.

# No answer yet
Stop before any write tool. Call ask_user for the first unanswered question, then wait. Do not list the choices in the reply. The card shows them.

# After the answers
- Edit where evidence is Direct.
- Propose, clearly labeled, where evidence is Adjacent.
- Do not edit Unsupported requirements; list them.
- Ask again only when an answer conflicts with the evidence, or a later change needs a home that was not named. One ask_user call, with ranked experiences from the résumé plus Other.

# Multiple homes
Prefer, in order: most recent → most relevant to the target role → strongest direct evidence. State the choice in the change log.

# Go all in
Only when the user explicitly says to tailor to the max and disregard realistic experience, or the brief says go all in.

Means: denser keyword alignment, leading with the most relevant evidence, more aggressive framing. Does not permit new tools, metrics, dates, titles, scope, or backdated stacks.

# Output
1. **Edits** — revised bullets or fields with experience IDs.
2. **Change log** — requirement → experience → evidence level → what changed.
3. **Gaps** — unsupported requirements, left out, with a one-line suggestion each ("add only if true", "omit", "cover in cover letter").
4. **Questions** — only for a brief conflict or a home the brief did not name.

Every requirement lands in edits, proposals, or gaps. Never silently drop one.

# Do not
- Stuff keywords or repeat a term unnaturally.
- Claim proficiency from a single mention.
- Strip useful general evidence to fit one posting.
- Treat "go all in" as permission to fabricate.

# Examples
Direct: "stakeholder management" ↔ "led weekly reviews with finance and ops" → "Managed stakeholders across finance and ops through weekly reviews."

Adjacent: "Kubernetes" ↔ "containerized services with Docker" → "Containerized services with Docker; working knowledge of orchestration." Label Adjacent.

Unsupported: "Terraform", no IaC evidence → gap only.

Brief conflict: brief puts "RAG" on a role that ended in 2016 with no generative-AI evidence → no edit; flag and ask. A "machine learning" line the user already wrote on that role stays.`;

/** The shipped Developer bullets file from just before the generative-AI cutoff. */
const PREVIOUS_GENAI_DEV_BULLETS_DESCRIPTION =
  "Write each bullet as one shipped change — verb, system, the stack that role actually used, and an outcome only when the source states one. Never adds a fact.";

const PREVIOUS_GENAI_DEV_BULLETS_BODY = `# Rule
One bullet = one change that was shipped.
Strong verb + what changed in the system + the stack this role actually used + outcome (only if the source states one).

# Tense
- Current role: present tense.
- Past roles: past tense.
- No end date, or "Present": current. Ended role: past, even if recent.

# Form
- Name the system, service, or pipeline. A bullet with no named system is not a developer bullet.
- Lead with the verb. Drop "responsible for", "worked on", "helped with", "leveraged", "utilized", "assisted with".
- One change per line. Don't split one change across two bullets or merge two changes into one.
- Keep the user's own names for tools and products. Don't rename their stack to a trendier equivalent.
- No first person. Match the résumé's existing punctuation and capitalization.
- If a line could sit on anyone's résumé, ground it in a fact from this role or delete it.

# Facts
Rewording is allowed. New facts are not. Never add, move, or inflate:
- tools, skills, certifications, technologies
- metrics, percentages, dollar amounts, volumes
- dates, titles, employers, education
- team size, scope, seniority, ownership
- a metric from one bullet onto another

**Stack must match the role's dates.** A technology belongs in the line only if that role used it. Do not add AI, LLMs, or any later stack to a role whose dates end before the user used them. Never move a later practice into an earlier job.

**Outcomes:** include only when the source bullet already states one. If the original has no number, leave it unquantified. Do not invent, estimate, or round a metric.

**Verbs must match the work.** Don't upgrade "implemented" to "designed", "contributed to" to "led", or "maintained" to "owned".

# Output
Rewritten bullets, in order, plus:
- **Flags** — source lines that were generic, fact-thin, or claimed an outcome with no number.
- **Dropped** — lines deleted as unfixable, with the reason.

Never silently delete a bullet.

# Do not
- Add a stack the role didn't use.
- Add a metric the source doesn't state.
- Merge or split changes.
- Write a bullet that could belong to any developer.

# Examples
Source: "Responsible for working on the payments service, helped with performance."
→ "Rebuilt the payments service's retry path in Go." (Add an outcome only if the source names one.)

Source: "Utilized React to assist with the dashboard."
→ "Built the analytics dashboard in React."

Source: 2019 role; user learned Kubernetes in 2022.
→ No Kubernetes. Flag: "K8s predates this role's dates."`;

const PREVIOUS_GENAI_PRAGMATIC_BODY = `# Rule
A requirement may be woven in only where the résumé already supports it. If nothing supports it, leave it out and report it as a gap.

# Boundary with Developer bullets
This skill decides what to weave and where. Developer bullets decides how the line reads and what counts as a fact. On any conflict — tense, stack-in-role, metrics, verbs — Developer bullets wins. "Go all in" relaxes emphasis, never facts.

# Evidence levels
Classify each matched requirement before editing:
- **Direct** — the same skill, tool, domain, or responsibility already appears on the named experience. Adjust wording so the match is obvious.
- **Adjacent** — transferable evidence only (related tool, analogous responsibility, same domain). Propose the line, label it Adjacent, keep the claim modest. Don't upgrade to Direct by wording.
- **Unsupported** — no evidence. No edit. Gap list.

# Placement brief
Structured placement instruction. Fields:
- \`skill\`
- \`experience_id\` (IDs, not names, when available)
- \`insertion_note\` — how the line should read
- \`source_evidence\` — optional supporting bullet or skill

When present:
- Put the named skill on the named experience. Do not shop around for a different home.
- Use their note for how the line reads.
- A brief authorizes placement, not fabrication. If the named experience has no supporting evidence, stop, flag the conflict, and ask before editing.

# No Placement brief
- Edit where evidence is Direct.
- Propose, clearly labeled, where evidence is Adjacent.
- Do not edit Unsupported requirements; list them.
- Ask only when placement is genuinely ambiguous: two or more plausible homes, or a high-impact requirement with no clear evidence.
- When asking, offer ranked candidate experiences plus Other. Never a bare "which experience?"

# Multiple homes
Prefer, in order: most recent → most relevant to the target role → strongest direct evidence. State the choice in the change log.

# Go all in
Only when the user explicitly says to tailor to the max and disregard realistic experience, or the brief says go all in.

Means: denser keyword alignment, leading with the most relevant evidence, more aggressive framing. Does not permit new tools, metrics, dates, titles, scope, or backdated stacks.

# Output
1. **Edits** — revised bullets or fields with experience IDs.
2. **Change log** — requirement → experience → evidence level → what changed.
3. **Gaps** — unsupported requirements, left out, with a one-line suggestion each ("add only if true", "omit", "cover in cover letter").
4. **Questions** — only for ambiguous placement or a brief conflict.

Every requirement lands in edits, proposals, or gaps. Never silently drop one.

# Do not
- Stuff keywords or repeat a term unnaturally.
- Claim proficiency from a single mention.
- Strip useful general evidence to fit one posting.
- Treat "go all in" as permission to fabricate.

# Examples
Direct: "stakeholder management" ↔ "led weekly reviews with finance and ops" → "Managed stakeholders across finance and ops through weekly reviews."

Adjacent: "Kubernetes" ↔ "containerized services with Docker" → "Containerized services with Docker; working knowledge of orchestration." Label Adjacent.

Unsupported: "Terraform", no IaC evidence → gap only.

Brief conflict: brief puts "AI" on a 2016 role with no AI evidence → no edit; flag and ask.`;

/** Earlier shipped text. Replaced on load only when the stored file still matches it. */
const PREVIOUS_DEV_BULLETS_DESCRIPTION =
  "One shipped change per line, using only tools and facts that role already had.";

const PREVIOUS_DEV_BULLETS_BODY = [
  "Write each bullet as one change that was shipped:",
  "Verb + what changed in the system + the stack that role actually used + an outcome only when the source bullet already states one.",
  "Past roles use past tense. The current role uses present tense.",
  'Name the system, service, or pipeline. Drop "responsible for", "worked on", "helped with", "leveraged", and "utilized".',
  "A technology belongs in the line only if that role used it. Do not add AI, LLMs, or any later stack to a role whose dates end before the user used them. Rewording is allowed. New facts are not.",
  "Do not invent metrics, employers, titles, or dates. If the original line has no number, leave it unquantified.",
  "One change per line. If a sentence could sit on anyone's résumé, rewrite it with a fact from this role or delete it.",
  "Keep the user's own names for tools and products.",
].join("\n");

const PREVIOUS_PRAGMATIC_DESCRIPTION =
  "Weave a requirement in only when the résumé already supports it, unless the user says to go all in.";

const PREVIOUS_PRAGMATIC_BODY = [
  "Default: tailor only when a new requirement can be woven into work the résumé already shows.",
  "Match a posting keyword to a role, project, or skill that already supports it, then adjust wording so the match is easy to see.",
  "If nothing on the résumé supports the requirement, leave it out and say so. Do not invent a bullet, a tool, or a metric to cover the gap.",
  "Do not move a later practice, including AI, into an earlier job.",
  "Go all in only when the user explicitly says to tailor to the max and disregard realistic experience, or the Placement brief says to go all in. Until then, stay honest.",
  "When the message includes a Placement brief, follow it: put the named skill on the named experience, using their note for how the line should read. Do not shop around for a different home.",
  "When the user asks to tailor to a job and the message has no Placement brief, ask before editing: which skill, which experience it belongs on, and how it should be inserted. Offer the experiences on the résumé as choices, plus an Other they can fill in.",
].join("\n");

export interface BuiltinAssistantSkill {
  id: string;
  key: string;
  name: string;
  description: string;
  body: string;
  scopes: AssistantSkillScope[];
}

export const BUILTIN_ASSISTANT_SKILLS: BuiltinAssistantSkill[] = [
  {
    id: "builtin-dev-bullets",
    key: "dev-bullets",
    name: "Developer bullets",
    description: DEV_BULLETS_DESCRIPTION,
    body: DEV_BULLETS_BODY,
    scopes: ["resume", "experience"],
  },
  {
    id: "builtin-pragmatic-tailoring",
    key: "pragmatic-tailoring",
    name: "Pragmatic tailoring",
    description: PRAGMATIC_TAILORING_DESCRIPTION,
    body: PRAGMATIC_TAILORING_BODY,
    scopes: ["resume", "experience", "dashboard"],
  },
  EMPTY_RESUME_SKILL,
  IMPORT_RESUMES_SKILL,
];

export function builtinAssistantSkill(key: string) {
  return BUILTIN_ASSISTANT_SKILLS.find((skill) => skill.key === key);
}

function storedSkill(name: string, body: string) {
  const parsed = parseSkillMarkdown(skillDocument({ name, body }));
  const resolved = parsed.name.trim() || name.trim() || "Untitled skill";
  const document = composeSkillMarkdown({
    name: resolved,
    description: parsed.description,
    body: parsed.body,
  }).slice(0, ASSISTANT_SKILL_BODY_MAX);
  return { name: resolved, body: document };
}

function sameDocument(left: string, right: string) {
  return left.trim() === right.trim();
}

const PREVIOUS_CARD_PRAGMATIC_BODY = `# Rule
A requirement may be woven in only where the résumé already supports it. If nothing supports it, leave it out and report it as a gap.

# Boundary with Developer bullets
This skill decides what to weave and where. Developer bullets decides how the line reads and what counts as a fact, including the generative-AI cutoff. On any conflict about tense, stack-in-role, metrics, or verbs, Developer bullets wins. "Go all in" relaxes emphasis, never facts.

# Evidence levels
Classify each matched requirement before editing:
- **Direct** — the same skill, tool, domain, or responsibility already appears on the named experience. Adjust wording so the match is obvious.
- **Adjacent** — transferable evidence only (related tool, analogous responsibility, same domain). Propose the line, label it Adjacent, keep the claim modest. Don't upgrade to Direct by wording.
- **Unsupported** — no evidence. No edit. Gap list.

# Placement brief
Structured placement instruction. Fields:
- \`skill\`
- \`experience_id\` (IDs, not names, when available)
- \`insertion_note\` — how the line should read
- \`source_evidence\` — optional supporting bullet or skill

When present:
- Put the named skill on the named experience. Do not shop around for a different home.
- Use their note for how the line reads.
- A brief authorizes placement, not fabrication. If the named experience has no supporting evidence, stop, flag the conflict, and ask before editing.

# No Placement brief
- Edit where evidence is Direct.
- Propose, clearly labeled, where evidence is Adjacent.
- Do not edit Unsupported requirements; list them.
- Ask only when placement is genuinely ambiguous: two or more plausible homes, or a high-impact requirement with no clear evidence.
- When asking, offer ranked candidate experiences plus Other. Never a bare "which experience?"

# Multiple homes
Prefer, in order: most recent → most relevant to the target role → strongest direct evidence. State the choice in the change log.

# Go all in
Only when the user explicitly says to tailor to the max and disregard realistic experience, or the brief says go all in.

Means: denser keyword alignment, leading with the most relevant evidence, more aggressive framing. Does not permit new tools, metrics, dates, titles, scope, or backdated stacks.

# Output
1. **Edits** — revised bullets or fields with experience IDs.
2. **Change log** — requirement → experience → evidence level → what changed.
3. **Gaps** — unsupported requirements, left out, with a one-line suggestion each ("add only if true", "omit", "cover in cover letter").
4. **Questions** — only for ambiguous placement or a brief conflict.

Every requirement lands in edits, proposals, or gaps. Never silently drop one.

# Do not
- Stuff keywords or repeat a term unnaturally.
- Claim proficiency from a single mention.
- Strip useful general evidence to fit one posting.
- Treat "go all in" as permission to fabricate.

# Examples
Direct: "stakeholder management" ↔ "led weekly reviews with finance and ops" → "Managed stakeholders across finance and ops through weekly reviews."

Adjacent: "Kubernetes" ↔ "containerized services with Docker" → "Containerized services with Docker; working knowledge of orchestration." Label Adjacent.

Unsupported: "Terraform", no IaC evidence → gap only.

Brief conflict: brief puts "RAG" on a role that ended in 2016 with no generative-AI evidence → no edit; flag and ask. A "machine learning" line the user already wrote on that role stays.`;

function previousDocuments(skill: BuiltinAssistantSkill) {
  if (skill.key === "dev-bullets") {
    return [
      PREVIOUS_DEV_BULLETS_BODY,
      composeSkillMarkdown({
        name: "Developer bullets",
        description: PREVIOUS_DEV_BULLETS_DESCRIPTION,
        body: PREVIOUS_DEV_BULLETS_BODY,
      }),
      composeSkillMarkdown({
        name: "Developer bullets",
        description: PREVIOUS_GENAI_DEV_BULLETS_DESCRIPTION,
        body: PREVIOUS_GENAI_DEV_BULLETS_BODY,
      }),
    ];
  }
  if (skill.key !== "pragmatic-tailoring") return [];
  return [
    PREVIOUS_PRAGMATIC_BODY,
    composeSkillMarkdown({
      name: "Pragmatic tailoring",
      description: PREVIOUS_PRAGMATIC_DESCRIPTION,
      body: PREVIOUS_PRAGMATIC_BODY,
    }),
    composeSkillMarkdown({
      name: "Pragmatic tailoring",
      description: PRAGMATIC_TAILORING_DESCRIPTION,
      body: PREVIOUS_GENAI_PRAGMATIC_BODY,
    }),
    composeSkillMarkdown({
      name: "Pragmatic tailoring",
      description: PRAGMATIC_TAILORING_DESCRIPTION,
      body: PREVIOUS_CARD_PRAGMATIC_BODY,
    }),
    composeSkillMarkdown({
      name: "Pragmatic tailoring",
      description: PRAGMATIC_TAILORING_DESCRIPTION,
      body: PREVIOUS_PLASTERED_PRAGMATIC_BODY,
    }),
  ];
}

/** Inserts each shipped skill once. An untouched older copy is replaced; an edit is left alone. */
export function ensureBuiltinAssistantSkills(db: AppDb) {
  const now = nowMs();
  for (const skill of BUILTIN_ASSISTANT_SKILLS) {
    const stored = storedSkill(skill.name, skillDocument(skill));
    const existing = db.collections.assistantSkill.get(skill.id);
    if (existing) {
      const stale = previousDocuments(skill).some((previous) =>
        sameDocument(existing.body, previous),
      );
      if (!stale || sameDocument(existing.body, stored.body)) continue;
      db.collections.assistantSkill.update(skill.id, (row) => {
        row.name = stored.name;
        row.body = stored.body;
        row.searchableText = joinSearchable(stored.name, stored.body);
        row.updatedAt = now;
      });
      continue;
    }
    const row: AssistantSkill = {
      id: skill.id,
      userId: null,
      name: stored.name,
      body: stored.body,
      scopes: [...skill.scopes],
      isDefault: true,
      builtinKey: skill.key,
      searchableText: joinSearchable(stored.name, stored.body),
      embedding: null,
      embeddingModel: null,
      createdAt: now,
      updatedAt: now,
    };
    db.collections.assistantSkill.insert(row);
  }
}

export interface AssistantSkillDraft {
  name: string;
  body: string;
  scopes: AssistantSkillScope[];
  isDefault: boolean;
}

export function insertAssistantSkill(
  db: AppDb,
  userId: string | null | undefined,
  draft: AssistantSkillDraft,
): AssistantSkill {
  const base = libraryRowBase(userId);
  const stored = storedSkill(draft.name, draft.body);
  const row: AssistantSkill = {
    id: base.id,
    userId: userId ?? null,
    name: stored.name,
    body: stored.body,
    scopes: draft.scopes,
    isDefault: draft.isDefault,
    builtinKey: null,
    searchableText: joinSearchable(stored.name, stored.body),
    embedding: null,
    embeddingModel: null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
  db.collections.assistantSkill.insert(row);
  return row;
}

export function updateAssistantSkill(db: AppDb, skillId: string, draft: AssistantSkillDraft) {
  const existing = db.collections.assistantSkill.get(skillId);
  if (!existing) throw new Error(`Assistant skill ${skillId} was not found.`);
  const stored = storedSkill(draft.name, draft.body);
  db.collections.assistantSkill.update(skillId, (row) => {
    row.name = stored.name;
    row.body = stored.body;
    row.scopes = draft.scopes;
    row.isDefault = draft.isDefault;
    row.searchableText = joinSearchable(stored.name, stored.body);
    row.updatedAt = nowMs();
  });
}

export function deleteAssistantSkill(db: AppDb, skillId: string) {
  db.collections.assistantSkill.delete(skillId);
}

/** Puts a shipped skill's name, body, and scopes back to the version that ships with the app. */
export function resetBuiltinAssistantSkill(db: AppDb, skillId: string) {
  const existing = db.collections.assistantSkill.get(skillId);
  const builtin = existing?.builtinKey ? builtinAssistantSkill(existing.builtinKey) : undefined;
  if (!existing || !builtin) return;
  const stored = storedSkill(builtin.name, skillDocument(builtin));
  db.collections.assistantSkill.update(skillId, (row) => {
    row.name = stored.name;
    row.body = stored.body;
    row.scopes = [...builtin.scopes];
    row.searchableText = joinSearchable(stored.name, stored.body);
    row.updatedAt = nowMs();
  });
}

export const ASSISTANT_SKILL_INSTRUCTIONS_MAX = 40_000;

/** Text appended to a chat's system prompt. Each skill is its markdown file, front matter included. */
export function formatAssistantSkills(
  skills: ReadonlyArray<{ name: string; body: string }>,
): string {
  const blocks = skills.flatMap((skill) => {
    const document = skillDocument(skill).trim();
    if (!document) return [];
    return [document];
  });
  if (blocks.length === 0) return "";
  return [
    "Assistant skills. Follow these when they apply. Each one is a markdown skill file.",
    ...blocks,
  ]
    .join("\n\n")
    .slice(0, ASSISTANT_SKILL_INSTRUCTIONS_MAX);
}
