/**
 * A scripted stand-in for the real AI workbench stream.
 *
 * It mirrors the shape of the performance harness at
 * `routes/_dashboard/dev/chat-stress/-utils/fake-chat-stream.ts` (thinking →
 * markdown → tool call → tool result), adds the part the landing needs — the
 * visitor watching the prompt get typed into the composer — and is short
 * enough to loop.
 *
 * The landing must never import the dashboard dev harness directly: it pulls in
 * the event-sourced DB, the viewer and the whole chat UI.
 */

export type WorkbenchPhase = "typing" | "thinking" | "text" | "tool" | "done";

export const WORKBENCH_VIEWS = ["preview", "changes", "events", "letter", "answers"] as const;

export type WorkbenchView = (typeof WORKBENCH_VIEWS)[number];

export interface WorkbenchToolFixture {
  name: string;
  /** Full JSON payload, streamed into the chip a few characters at a time. */
  args: string;
  result: string;
  /** Short human line shown once the result lands. */
  summary: string;
  /** Contribution to the `+n −m` counter on the Changes tab. */
  diff: { added: number; removed: number } | null;
  /** Tab the preview opens once this result lands. */
  view: WorkbenchView;
  /** When set, the chat renders a question card instead of a tool chip. */
  ask?: {
    question: string;
    options: readonly string[];
    selected: string;
  };
}

export interface WorkbenchToolRun {
  name: string;
  /** How much of the payload has streamed in. */
  args: string;
  result: string | null;
  summary: string;
  diff: { added: number; removed: number } | null;
  ask: WorkbenchToolFixture["ask"] | null;
}

export type WorkbenchPart =
  | { id: string; kind: "thinking"; text: string }
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "tool"; tool: WorkbenchToolRun };

export type WorkbenchStep =
  | { kind: "phase"; phase: WorkbenchPhase }
  | { kind: "type"; delta: string }
  | { kind: "send" }
  | { kind: "thinking"; id: string; delta: string }
  | { kind: "text"; id: string; delta: string }
  | { kind: "toolStart"; id: string; tool: WorkbenchToolFixture }
  | { kind: "toolArgs"; delta: string }
  | { kind: "pause" }
  | { kind: "toolResult"; content: string; view: WorkbenchView };

export const WORKBENCH_PROMPT =
  "Tailor this résumé to the Northwind posting, write the cover letter, and answer their questions.";

export const WORKBENCH_THINKING =
  "Northwind wants a staff frontend owner for their design system. Capture the posting, ask how far to tailor, then edit. Every employer and every date stays as it is, and each edit lands on Events so it can be undone. ";

export const WORKBENCH_INTRO =
  "## Plan — one pass\n\n" +
  "- Capture the posting and keep the source text.\n" +
  "- Ask how far to tailor before rewriting anything.\n" +
  "- Re-rank the library parts against it.\n" +
  "- Rewrite the summary, the first bullet and the skill order.\n" +
  "- Draft the letter and the three application answers.\n\n";

export const WORKBENCH_AFTER_CAPTURE =
  "**Posting captured** and attached to this résumé. The library parts re-rank against it, so the résumé pass starts from evidence. ";

export const WORKBENCH_BEFORE_WRITING =
  "Résumé pass done: summary, bullets, skills. Writing the two application artefacts now. ";

export const WORKBENCH_DONE =
  "## Done\n\n" +
  "Résumé re-ranked, posting attached, a 104-word letter and three answers saved.\n\n" +
  "> Every employer and every date is unchanged. Open Events to undo any edit you did not want. ";

export const WORKBENCH_TOOLS = {
  captureJob: {
    name: "save_job",
    args: '{"url":"https://northwind.com/careers/staff-fe","company":"Northwind","title":"Staff Frontend Engineer","attachToResumeId":"ai-engineer"}',
    result:
      '{"job":{"id":"northwind-staff-fe","title":"Staff Frontend Engineer","company":"Northwind"},"created":true,"attachedToResumeId":"ai-engineer"}',
    summary: "Posting captured",
    diff: null,
    view: "preview",
  },
  askScope: {
    name: "ask_user",
    args: '{"question":"How far should I tailor this résumé?","options":[{"id":"summary","label":"Summary only"},{"id":"bullets","label":"Summary and bullets"},{"id":"full","label":"Full pass"}],"allowMultiple":false}',
    result: '{"selected":[{"id":"full","label":"Full pass"}]}',
    summary: "Full pass",
    diff: null,
    view: "preview",
    ask: {
      question: "How far should I tailor this résumé?",
      options: ["Summary only", "Summary and bullets", "Full pass"],
      selected: "Full pass",
    },
  },
  setSummary: {
    name: "set_summary",
    args: '{"resumeId":"ai-engineer","lines":3,"maxChars":180}',
    result: '{"ok":true,"changed":["summary"],"lines":3}',
    summary: "Summary rewritten",
    diff: { added: 1, removed: 1 },
    view: "preview",
  },
  setBullets: {
    name: "set_experience_bullets",
    args: '{"resumeId":"ai-engineer","experienceId":"northwind","kept":3,"dropped":2}',
    result: '{"ok":true,"changed":["experience.northwind.bullets"],"kept":3,"dropped":2}',
    summary: "3 of 5 bullets kept",
    diff: { added: 3, removed: 2 },
    /** Pops open the diff so the visitor sees the edit land. */
    view: "changes",
  },
  setSkills: {
    name: "set_skills",
    args: '{"resumeId":"ai-engineer","order":["TypeScript","React","Design systems","Playwright"]}',
    result: '{"ok":true,"changed":["skills"]}',
    summary: "Skills re-ranked",
    diff: { added: 1, removed: 1 },
    view: "events",
  },
  saveLetter: {
    name: "save_cover_letter",
    args: '{"resumeId":"ai-engineer","jobId":"northwind-staff-fe","tone":"direct"}',
    result:
      '{"coverLetter":{"id":"cl-northwind","title":"Northwind — Staff Frontend Engineer","wordCount":104},"created":true}',
    summary: "Letter drafted · 104 words",
    diff: null,
    view: "letter",
  },
  saveAnswers: {
    name: "save_application_answers",
    args: '{"resumeId":"ai-engineer","jobId":"northwind-staff-fe","questions":3}',
    result:
      '{"answers":[{"question":"Why Northwind?","placeholders":0},{"question":"A project you owned","placeholders":0},{"question":"When can you start?","placeholders":1}],"created":3,"updated":0}',
    summary: "3 answers saved",
    diff: null,
    view: "answers",
  },
} satisfies Record<string, WorkbenchToolFixture>;

/** Ordered tool run: capture → résumé → letter → answers. */
export const WORKBENCH_TOOL_ORDER = [
  WORKBENCH_TOOLS.captureJob,
  WORKBENCH_TOOLS.askScope,
  WORKBENCH_TOOLS.setSummary,
  WORKBENCH_TOOLS.setBullets,
  WORKBENCH_TOOLS.setSkills,
  WORKBENCH_TOOLS.saveLetter,
  WORKBENCH_TOOLS.saveAnswers,
] as const;

/** The résumé the preview panel renders before and after the pass. */
export const RESUME_CONTENT = {
  name: "Dana Okafor",
  title: "Frontend platform engineer · Lisbon",
  baseSummary:
    "Frontend engineer with eight years building product surfaces. Comfortable across the stack, strong on components and testing.",
  tailoredSummary:
    "Frontend platform engineer who shipped a design system used by 40 teams, cut start-up time 30%, and owns the release path end to end.",
  bullets: [
    {
      before: "Worked on the shared component library and helped other teams adopt it.",
      after: "Shipped the design system 40 teams build on, and owned its adoption path.",
    },
    {
      before: "Improved performance across the application.",
      after: "Cut start-up time 30% by splitting the shell and deferring the editor bundle.",
    },
    {
      before: "Wrote tests for the checkout flow.",
      after: "Built the Playwright suite that guards checkout, 180 specs, run on every PR.",
    },
    {
      before: "Responsible for various frontend initiatives.",
      after: null,
    },
    {
      before: "Collaborated with designers and product managers.",
      after: null,
    },
  ],
  baseSkills: ["React", "TypeScript", "Playwright", "Design systems"],
  tailoredSkills: ["TypeScript", "React", "Design systems", "Playwright"],
} as const;

/** Rows on the Changes tab, revealed as the resume-writing tools land. */
export const WORKBENCH_CHANGES = [
  {
    tool: "set_summary",
    label: "Summary",
    removed: RESUME_CONTENT.baseSummary,
    added: RESUME_CONTENT.tailoredSummary,
  },
  {
    tool: "set_experience_bullets",
    label: "Northwind — bullet 1",
    removed: RESUME_CONTENT.bullets[0].before,
    added: RESUME_CONTENT.bullets[0].after,
  },
  {
    tool: "set_experience_bullets",
    label: "Northwind — bullet 4",
    removed: RESUME_CONTENT.bullets[3].before,
    added: null,
  },
  {
    tool: "set_experience_bullets",
    label: "Northwind — bullet 5",
    removed: RESUME_CONTENT.bullets[4].before,
    added: null,
  },
  {
    tool: "set_skills",
    label: "Skills",
    removed: RESUME_CONTENT.baseSkills.join(" · "),
    added: RESUME_CONTENT.tailoredSkills.join(" · "),
  },
] as const;

/** Rows on the Events tab, newest first, revealed as the matching tool lands. */
export const WORKBENCH_EVENTS = [
  { tool: "set_skills", label: "Skills", detail: "Reordered to match the posting" },
  { tool: "set_experience_bullets", label: "Experience", detail: "Kept 3 bullets, dropped 2" },
  { tool: "set_summary", label: "Summary", detail: "Rewritten for the staff role" },
] as const;

export const COVER_LETTER_CONTENT = {
  title: "Northwind — Staff Frontend Engineer",
  wordCount: 104,
  paragraphs: [
    "Dear Northwind team,",
    "I build the frontend platform other teams ship on. At Lattice I shipped the design system 40 teams build on, cut start-up time 30% by splitting the shell, and kept the release path green with a 180-spec Playwright suite.",
    "Your posting asks for an owner who can hold the system and the migration at once. That has been my job for six years: the component library, its adoption path, and the performance budget that keeps it honest.",
    "I would like to do the same for Northwind. The résumé beside this letter has the details.",
    "Dana Okafor",
  ],
} as const;

export const APPLICATION_ANSWERS_CONTENT = [
  {
    question: "Why do you want to work at Northwind?",
    answer:
      "Northwind is rebuilding its frontend on one design system. I have done that migration twice, and I want to own the second half: adoption, performance budgets, and the release path that keeps 40 teams moving.",
    needsDetail: false,
  },
  {
    question: "Describe a project you owned end to end.",
    answer:
      "I shipped the design system at Lattice, from the first component to the migration of 40 teams. I owned the API, the codemods, the docs and the Playwright suite that guards it.",
    needsDetail: false,
  },
  {
    question: "When can you start?",
    answer: "I can start in [add date]; my notice period is four weeks.",
    needsDetail: true,
  },
] as const;

export interface WorkbenchStreamState {
  /** Text currently in the composer. */
  draft: string;
  /** The prompt after it was sent, shown as the user bubble. */
  prompt: string;
  /** Ordered timeline: thinking, markdown and tool calls interleaved. */
  parts: WorkbenchPart[];
  phase: WorkbenchPhase;
  tokens: number;
  view: WorkbenchView;
  /** True once the visitor picks a tab, so the script stops switching it. */
  viewPinned: boolean;
  run: number;
}

export function initialWorkbenchState(): WorkbenchStreamState {
  return {
    draft: "",
    prompt: "",
    parts: [],
    phase: "typing",
    tokens: 0,
    view: "preview",
    viewPinned: false,
    run: 0,
  };
}

/** Splits on word boundaries but keeps whitespace so the reflow is invisible. */
function tokenize(text: string) {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

/** Groups tokens so one tick types 1–2 words instead of one per frame. */
function group(tokens: string[], size = 2) {
  const groups: string[] = [];
  for (let index = 0; index < tokens.length; index += size) {
    groups.push(tokens.slice(index, index + size).join(""));
  }
  return groups;
}

/** Character chunks, for the composer typing simulation and tool payloads. */
function chunk(text: string, size: number) {
  return text.match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) ?? [];
}

function countTokens(delta: string) {
  return delta.trim().split(/\s+/).filter(Boolean).length;
}

let partSequence = 0;

function nextPartId() {
  partSequence += 1;
  return `p${partSequence}`;
}

function streamText(text: string, id: string) {
  return group(tokenize(text)).map((delta) => ({ kind: "text" as const, id, delta }));
}

function streamThinking(text: string, id: string) {
  return group(tokenize(text)).map((delta) => ({ kind: "thinking" as const, id, delta }));
}

function toolSteps(fixture: WorkbenchToolFixture, id: string): WorkbenchStep[] {
  const steps: WorkbenchStep[] = [{ kind: "toolStart", id, tool: fixture }];
  for (const delta of chunk(fixture.args, 4)) {
    steps.push({ kind: "toolArgs", delta });
  }
  if (fixture.ask) steps.push({ kind: "pause" });
  steps.push({ kind: "toolResult", content: fixture.result, view: fixture.view });
  return steps;
}

export function buildWorkbenchSteps(): WorkbenchStep[] {
  const steps: WorkbenchStep[] = [{ kind: "phase", phase: "typing" }];

  for (const delta of chunk(WORKBENCH_PROMPT, 2)) {
    steps.push({ kind: "type", delta });
  }

  steps.push({ kind: "send" });
  steps.push({ kind: "phase", phase: "thinking" });
  steps.push(...streamThinking(WORKBENCH_THINKING, nextPartId()));

  // Capture the posting before touching the résumé, the way the playbook asks.
  steps.push({ kind: "phase", phase: "text" });
  steps.push(...streamText(WORKBENCH_INTRO, nextPartId()));

  steps.push({ kind: "phase", phase: "tool" });
  steps.push(...toolSteps(WORKBENCH_TOOLS.captureJob, nextPartId()));
  steps.push(...toolSteps(WORKBENCH_TOOLS.askScope, nextPartId()));

  steps.push({ kind: "phase", phase: "text" });
  steps.push(...streamText(WORKBENCH_AFTER_CAPTURE, nextPartId()));

  steps.push({ kind: "phase", phase: "tool" });
  steps.push(...toolSteps(WORKBENCH_TOOLS.setSummary, nextPartId()));
  steps.push(...toolSteps(WORKBENCH_TOOLS.setBullets, nextPartId()));
  steps.push(...toolSteps(WORKBENCH_TOOLS.setSkills, nextPartId()));

  steps.push({ kind: "phase", phase: "text" });
  steps.push(...streamText(WORKBENCH_BEFORE_WRITING, nextPartId()));

  steps.push({ kind: "phase", phase: "tool" });
  steps.push(...toolSteps(WORKBENCH_TOOLS.saveLetter, nextPartId()));
  steps.push(...toolSteps(WORKBENCH_TOOLS.saveAnswers, nextPartId()));

  steps.push({ kind: "phase", phase: "text" });
  steps.push(...streamText(WORKBENCH_DONE, nextPartId()));

  steps.push({ kind: "phase", phase: "done" });

  return steps;
}

/** Applies one scripted step. Shared by the ticking hook and the static render. */
export function applyWorkbenchStep(
  state: WorkbenchStreamState,
  step: WorkbenchStep,
): WorkbenchStreamState {
  switch (step.kind) {
    case "phase":
      return { ...state, phase: step.phase };
    case "type":
      return { ...state, draft: state.draft + step.delta };
    case "send":
      return { ...state, prompt: state.draft, draft: "", parts: [] };
    case "thinking": {
      const last = state.parts[state.parts.length - 1];
      if (last?.kind === "thinking" && last.id === step.id) {
        return {
          ...state,
          parts: [...state.parts.slice(0, -1), { ...last, text: last.text + step.delta }],
          tokens: state.tokens + countTokens(step.delta),
        };
      }
      return {
        ...state,
        parts: [...state.parts, { id: step.id, kind: "thinking", text: step.delta }],
        tokens: state.tokens + countTokens(step.delta),
      };
    }
    case "text": {
      const last = state.parts[state.parts.length - 1];
      if (last?.kind === "text" && last.id === step.id) {
        return {
          ...state,
          parts: [...state.parts.slice(0, -1), { ...last, text: last.text + step.delta }],
          tokens: state.tokens + countTokens(step.delta),
        };
      }
      return {
        ...state,
        parts: [...state.parts, { id: step.id, kind: "text", text: step.delta }],
        tokens: state.tokens + countTokens(step.delta),
      };
    }
    case "toolStart":
      return {
        ...state,
        parts: [
          ...state.parts,
          {
            id: step.id,
            kind: "tool",
            tool: {
              name: step.tool.name,
              args: "",
              result: null,
              summary: step.tool.summary,
              diff: step.tool.diff,
              ask: step.tool.ask ?? null,
            },
          },
        ],
      };
    case "pause":
      return state;
    case "toolArgs": {
      const last = state.parts[state.parts.length - 1];
      if (last?.kind !== "tool" || last.tool.result !== null) return state;
      return {
        ...state,
        parts: [
          ...state.parts.slice(0, -1),
          { ...last, tool: { ...last.tool, args: last.tool.args + step.delta } },
        ],
      };
    }
    case "toolResult": {
      const last = state.parts[state.parts.length - 1];
      if (last?.kind !== "tool" || last.tool.result !== null) return state;
      return {
        ...state,
        view: state.viewPinned ? state.view : step.view,
        parts: [
          ...state.parts.slice(0, -1),
          { ...last, tool: { ...last.tool, result: step.content } },
        ],
      };
    }
  }
}

/** Final state, used for the reduced-motion render and the replay button target. */
export function completedWorkbenchState(): WorkbenchStreamState {
  let state = initialWorkbenchState();
  for (const step of buildWorkbenchSteps()) {
    state = applyWorkbenchStep(state, step);
  }
  return state;
}
