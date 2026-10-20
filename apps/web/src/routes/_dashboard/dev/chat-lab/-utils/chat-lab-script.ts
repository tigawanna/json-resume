import { EventType, type StreamChunk } from "@tanstack/ai";

export const CHAT_LAB_PRESETS = [
  {
    id: "jd-draft",
    label: "Draft a résumé from a JD",
    detail:
      "A long scripted turn: ten read tools, markdown, more read tools, markdown, then a real clone so the résumé card renders. The copy is named “JD draft (chat lab)” and is not made active.",
  },
  {
    id: "markdown",
    label: "Markdown blocks",
    detail: "Text, a list, and a code block. No tools.",
  },
  {
    id: "who-am-i",
    label: "Hello, who am I?",
    detail: "Calls list_resumes on the client, then writes a follow-up from the tool result.",
  },
  {
    id: "list-resumes",
    label: "List résumés",
    detail: "Calls list_resumes and lets the client run it.",
  },
  {
    id: "broken-args",
    label: "Broken tool arguments",
    detail: "Opens get_resume with truncated JSON, then ends the run with an error.",
  },
  {
    id: "unknown-tool",
    label: "Unknown tool",
    detail: "Calls a tool the client does not have.",
  },
  {
    id: "abrupt-stop",
    label: "Abrupt stop",
    detail: "Streams a paragraph and closes the response without RUN_FINISHED.",
  },
  {
    id: "two-tools",
    label: "Two tools, one turn",
    detail: "Emits list_resumes twice before the run finishes.",
  },
  {
    id: "calltek-stress",
    label: "CallTek sequence, six tools a step",
    detail:
      "Rewrites the selected résumé's headline, then replays the CallTek tool order. Every step is the real tool plus five get_resume calls, so the transcript and preview update six times before the next step. Also saves a lab job, clones an inactive draft, replaces the summary, and saves a cover letter.",
  },
] as const;

export type ChatLabPresetId = (typeof CHAT_LAB_PRESETS)[number]["id"];

export function isChatLabPreset(value: string): value is ChatLabPresetId {
  return CHAT_LAB_PRESETS.some((preset) => preset.id === value);
}

const MARKDOWN = [
  "# Résumé read, in full\n\n",
  "This is a scripted reply with no model behind it. It stays in the thread after the run finishes. The point is a long markdown message: headings, paragraphs, a list, a table, a quote, and a code block, enough that the chat has to scroll.\n\n",
  "## What the posting is asking for\n\n",
  "The posting is for a senior engineer who owns a frontend platform. It names React and TypeScript as the daily stack, and it wants proof that testing is part of the work rather than a line at the bottom of the résumé. The reader will spend about thirty seconds on the first screen, so the summary and the first role have to carry the argument. Everything after that is evidence.\n\n",
  "A strong match does three things in the first half page. It uses the posting's title in the headline. It leads the summary with an outcome, not a list of tools. And it puts the tools the posting repeats — **TypeScript**, **React**, and a test runner — at the front of the skills list, not buried after a dozen adjacent technologies.\n\n",
  "## What I would change\n\n",
  "- Lead the summary with an outcome: what shipped, for whom, and what changed because of it.\n",
  '- Cut the bullet that repeats the Playwright point. One bullet should own that story, with the number of suites or the flake rate, not three bullets that all say "wrote tests".\n',
  "- Put **TypeScript** and **React** first in skills. Move the rest into groups so a skim still hits the posting's words.\n",
  '- Rewrite the current-role bullets so each one starts with a verb and ends with a result. Adjectives ("robust", "scalable") come out.\n',
  "- Drop the volunteer section down, or cut it to two bullets. It is real, but it is not what this posting is scoring.\n",
  "- Keep the dates and employers exactly as they are. A tailored draft reframes. It does not invent a job.\n\n",
  "## How the first role should read\n\n",
  "The current role is the one a recruiter checks against the posting. Right now it reads as a list of responsibilities. It should read as ownership. The first bullet names the platform, the stack, and the outcome. The second bullet is the testing story, once. The third is a constraint: team size, latency, or a migration. Two more bullets are enough. A sixth bullet that restates the first is why the page feels long without saying more.\n\n",
  "The older roles stay shorter. They exist to show the same skills earlier, not to compete with the current job. If a bullet from 2018 is more specific than the current role, pull that specificity forward instead of leaving the best evidence at the bottom.\n\n",
  "## A check before calling it done\n\n",
  "```ts\nexport function scoreBullet(bullet: string) {\n  const hasNumber = /\\d/.test(bullet);\n  const startsWithVerb = /^[A-Z][a-z]+ed\\b/.test(bullet);\n  const vague = /robust|scalable|various|multiple/.test(bullet);\n  return Number(hasNumber) + Number(startsWithVerb) - Number(vague);\n}\n```\n\n",
  "Run that over the bullets you keep. A bullet that scores zero is a candidate to cut or rewrite. A bullet that scores two can stay. This is a heuristic, not a rule: a good bullet about a migration may not have a number, and it should still stay if the posting asked for migrations.\n\n",
  '| Section | What a skim should find | What to cut |\n| --- | --- | --- |\n| Headline | The posting\'s title, plus the two tools it repeats | A generic "software engineer" line |\n| Summary | One outcome, then the stack | A paragraph of every technology ever used |\n| Current role | Platform ownership, then the test story | A second bullet that repeats Playwright |\n| Skills | TypeScript and React first | A flat list of twenty adjacent tools |\n| Older roles | The same skills, earlier, in fewer bullets | Duties that could belong to anyone on the team |\n\n',
  "> The posting asks for ownership of the frontend platform. The first bullet of the current role should say that in the posting's words, with the stack and the result in the same sentence.\n\n",
  "## What this scripted turn is not\n\n",
  "It does not read the résumé, call a tool, or change the library. It is here so the chat can render a long markdown reply and keep it after the stream stops. If this message disappears when the run finishes, the transcript was cleared. It should still be here, with every section above, the table, and the code block.\n\n",
  "That is the whole scripted turn.\n",
].join("");

type LoosePart = { type?: string };
type LooseMessage = { role?: string; parts?: LoosePart[] };

/** True once the client has posted a tool result back for this turn. */
export function continuingAfterTool(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  let lastUser = -1;
  messages.forEach((message, index) => {
    if (isMessage(message) && message.role === "user") lastUser = index;
  });
  return messages.slice(lastUser + 1).some((message) => {
    if (!isMessage(message) || !Array.isArray(message.parts)) return false;
    return message.parts.some((part) => part.type === "tool-result" || part.type === "tool-call");
  });
}

function isMessage(value: unknown): value is LooseMessage {
  return typeof value === "object" && value !== null;
}

/** Tool calls the client already ran for the prompt that is still in flight. */
function toolCallCount(messages: unknown): number {
  if (!Array.isArray(messages)) return 0;
  let lastUser = -1;
  messages.forEach((message, index) => {
    if (isMessage(message) && message.role === "user") lastUser = index;
  });
  return messages.slice(lastUser + 1).reduce((count, message) => {
    if (!isMessage(message) || !Array.isArray(message.parts)) return count;
    return count + message.parts.filter((part) => part.type === "tool-call").length;
  }, 0);
}

function sleep(ms: number, signal: AbortSignal | undefined) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function* textMessage(
  messageId: string,
  text: string,
  signal: AbortSignal | undefined,
): AsyncGenerator<StreamChunk> {
  yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" };
  const chunks = text.split(/(?<=\n\n)/);
  for (const chunk of chunks) {
    if (signal?.aborted) return;
    if (chunk.length === 0) continue;
    yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: chunk };
    await sleep(24, signal);
  }
  yield { type: EventType.TEXT_MESSAGE_END, messageId };
}

function* answeredTool(
  toolCallId: string,
  name: string,
  args: string,
  result: string,
  parentMessageId: string,
): Generator<StreamChunk> {
  yield* toolCall(toolCallId, name, args, parentMessageId);
  yield {
    type: EventType.TOOL_CALL_RESULT,
    messageId: `${toolCallId}-result`,
    toolCallId,
    content: result,
    role: "tool",
  };
}

const READ_TOOLS: Array<{ name: string; args: string; result: string }> = [
  {
    name: "list_resumes",
    args: '{"limit":20,"offset":0}',
    result: '{"total":12,"nextOffset":null,"resumes":[]}',
  },
  {
    name: "get_resume",
    args: '{"sections":["summary","experience","skills"]}',
    result: '{"id":"active","name":"Active résumé","sections":["summary","experience","skills"]}',
  },
  {
    name: "list_jobs",
    args: '{"limit":10,"offset":0}',
    result: '{"total":4,"nextOffset":null,"jobs":[]}',
  },
  {
    name: "get_job",
    args: '{"jobId":"jd-lab"}',
    result: '{"id":"jd-lab","title":"Senior Frontend Engineer","company":"Northwind"}',
  },
  {
    name: "search_library",
    args: '{"keyword":"react typescript","limit":10}',
    result: '{"total":6,"nextOffset":null,"items":[]}',
  },
  {
    name: "list_cover_letters",
    args: '{"limit":5,"offset":0}',
    result: '{"total":1,"nextOffset":null,"coverLetters":[]}',
  },
  {
    name: "get_resume",
    args: '{"sections":["experience"]}',
    result: '{"id":"active","sections":["experience"]}',
  },
  {
    name: "list_resumes",
    args: '{"keyword":"frontend","limit":8,"offset":0}',
    result: '{"total":3,"nextOffset":null,"resumes":[]}',
  },
  {
    name: "search_library",
    args: '{"keyword":"playwright","limit":5}',
    result: '{"total":2,"nextOffset":null,"items":[]}',
  },
  {
    name: "get_resume",
    args: '{"sections":["skills","projects"]}',
    result: '{"id":"active","sections":["skills","projects"]}',
  },
  {
    name: "list_jobs",
    args: '{"limit":5,"offset":0}',
    result: '{"total":4,"nextOffset":null,"jobs":[]}',
  },
];

const LATER_TOOLS: Array<{ name: string; args: string; result: string }> = [
  {
    name: "list_jobs",
    args: '{"keyword":"frontend","limit":5,"offset":0}',
    result: '{"total":1,"nextOffset":null,"jobs":[]}',
  },
  {
    name: "get_job",
    args: '{"jobId":"jd-lab"}',
    result:
      '{"id":"jd-lab","description":"Own the frontend platform. React, TypeScript, Playwright."}',
  },
  {
    name: "get_resume",
    args: '{"sections":["summary"]}',
    result: '{"id":"active","sections":["summary"]}',
  },
  {
    name: "search_library",
    args: '{"keyword":"platform","limit":8}',
    result: '{"total":3,"nextOffset":null,"items":[]}',
  },
  {
    name: "list_cover_letters",
    args: '{"keyword":"frontend","limit":5,"offset":0}',
    result: '{"total":0,"nextOffset":null,"coverLetters":[]}',
  },
];

async function* jdDraftRun(
  runId: string,
  signal: AbortSignal | undefined,
): AsyncGenerator<StreamChunk> {
  const messageId = `${runId}-text`;
  yield* textMessage(
    messageId,
    [
      "## Reading the posting\n\n",
      "The posting is for a **Senior Frontend Engineer**. I will read the library first, then compare it with the active résumé, then copy a draft you can delete.\n\n",
      "Requirements I am matching:\n\n",
      "- React and TypeScript as the daily stack\n- Ownership of a frontend platform\n- Playwright in the test story\n\n",
    ].join(""),
    signal,
  );

  for (let index = 0; index < READ_TOOLS.length; index++) {
    if (signal?.aborted) return;
    const tool = READ_TOOLS[index];
    yield* answeredTool(`${runId}-read-${index}`, tool.name, tool.args, tool.result, messageId);
  }

  yield* textMessage(
    `${runId}-mid`,
    [
      "## What already fits\n\n",
      "The active résumé already leads with the frontend platform. The gaps are the posting's title in the headline and a Playwright bullet that states the outcome.\n\n",
      '```ts\nexport const postingFit = {\n  title: "Senior Frontend Engineer",\n  must: ["React", "TypeScript", "Playwright"],\n};\n```\n\n',
      "| Gap | Where it should land |\n| --- | --- |\n| Title | Headline |\n| Platform ownership | First bullet |\n| Playwright | A project bullet |\n\n",
    ].join(""),
    signal,
  );

  for (let index = 0; index < LATER_TOOLS.length; index++) {
    if (signal?.aborted) return;
    const tool = LATER_TOOLS[index];
    yield* answeredTool(`${runId}-later-${index}`, tool.name, tool.args, tool.result, messageId);
  }

  yield* textMessage(
    `${runId}-before-clone`,
    "I have enough to copy the active résumé into a draft named **JD draft (chat lab)**. It stays inactive, so the résumé you have open does not change. Delete that copy when you are finished.\n",
    signal,
  );

  yield* toolCall(
    `${runId}-clone`,
    "clone_resume",
    JSON.stringify({
      name: "JD draft (chat lab)",
      description: "Scripted copy from the chat lab. Safe to delete.",
      makeActive: false,
    }),
    `${runId}-before-clone`,
  );
}
function* toolCall(
  toolCallId: string,
  name: string,
  args: string,
  parentMessageId: string,
): Generator<StreamChunk> {
  yield {
    type: "TOOL_CALL_START",
    toolCallId,
    toolCallName: name,
    parentMessageId,
  };
  yield { type: EventType.TOOL_CALL_ARGS, toolCallId, delta: args };
  yield { type: "TOOL_CALL_END", toolCallId };
}

/** One real tool, then five extra reads, so each step paints six cards. */
const STRESS_FANOUT = 6;

const CALLTEK_SEARCHES = [
  "RabbitMQ",
  "legacy modernise",
  "architecture design decisions",
  "Azure Kafka messaging",
  "legacy",
  "architect",
] as const;

function calltekSteps(
  resumeId: string,
): Array<{ label: string; name: string; args: Record<string, unknown> }> {
  return [
    {
      label: "update_resume_details",
      name: "update_resume_details",
      args: { resumeId, headline: "Chat lab stress — CallTek sequence" },
    },
    {
      label: "get_resume",
      name: "get_resume",
      args: { resumeId, sections: ["header", "summary", "experience", "skills"] },
    },
    { label: "get_playbook tailored_copy", name: "get_playbook", args: { name: "tailored_copy" } },
    { label: "get_playbook cover_letter", name: "get_playbook", args: { name: "cover_letter" } },
    {
      label: "save_job",
      name: "save_job",
      args: {
        description:
          "Chat lab stress posting. Software Architect, enterprise SaaS, Node.js, TypeScript, PostgreSQL, legacy modernization. Not a real application.",
        title: "Software Architect",
        company: "CallTek (chat lab)",
        attachToResumeId: resumeId,
      },
    },
    {
      label: "rank_library_for_job",
      name: "rank_library_for_job",
      args: {
        resumeId,
        jobText:
          "Software Architect, SaaS, Node.js, TypeScript, PostgreSQL, legacy modernization, Kafka, Azure.",
        limit: 12,
        includeOnResume: false,
      },
    },
    ...CALLTEK_SEARCHES.map((keyword) => ({
      label: `search_library ${keyword}`,
      name: "search_library",
      args: {
        section: "experience_bullet",
        keyword,
        limit: 15,
        offset: 0,
        resumeId,
        notOnResume: true,
      },
    })),
    {
      label: "clone_resume",
      name: "clone_resume",
      args: {
        sourceResumeId: resumeId,
        name: "Chat lab stress draft",
        description: "Inactive copy from the CallTek stress preset. Safe to delete.",
        makeActive: false,
      },
    },
    {
      label: "set_summary",
      name: "set_summary",
      args: {
        resumeId,
        text: "Chat lab stress summary. This replaced the summary on the résumé you selected so the preview would re-render. Put the original back when you are done.",
      },
    },
    {
      label: "save_cover_letter",
      name: "save_cover_letter",
      args: {
        resumeId,
        title: "Chat lab — CallTek stress",
        body: "Chat lab cover letter. Written so the letter card renders during the stress run.\n\nDelete it when you are done.",
      },
    },
    { label: "open_resume", name: "open_resume", args: { resumeId, tab: "ai" } },
    {
      label: "wrap_up",
      name: "wrap_up",
      args: {
        summary:
          "Chat lab stress run finished. Headline and summary on the selected résumé were overwritten. An inactive draft and a cover letter were saved.",
        resumes: [
          { resumeId, role: "edited", note: "Headline and summary overwritten by the lab." },
        ],
      },
    },
  ];
}

async function* calltekStressRun(input: {
  runId: string;
  resumeId: string;
  messages: unknown;
  signal: AbortSignal | undefined;
}): AsyncGenerator<StreamChunk> {
  const steps = calltekSteps(input.resumeId);
  const stepIndex = Math.floor(toolCallCount(input.messages) / STRESS_FANOUT);
  const step = steps[stepIndex];
  if (!step) {
    yield* textMessage(
      `${input.runId}-done`,
      `Stress run finished. ${steps.length} steps, ${STRESS_FANOUT} tool cards each. The headline and summary on this résumé were overwritten.\n`,
      input.signal,
    );
    return;
  }

  yield* textMessage(
    `${input.runId}-step`,
    `Step ${stepIndex + 1} of ${steps.length}: ${step.label}. Then ${STRESS_FANOUT - 1} extra get_resume calls.\n`,
    input.signal,
  );
  if (input.signal?.aborted) return;

  for (let copy = 0; copy < STRESS_FANOUT; copy++) {
    const name = copy === 0 ? step.name : "get_resume";
    const args =
      copy === 0
        ? step.args
        : { resumeId: input.resumeId, sections: ["summary", "experience", "skills"] };
    yield* toolCall(
      `${input.runId}-${stepIndex}-${copy}`,
      name,
      JSON.stringify(args),
      `${input.runId}-step`,
    );
  }
}

/**
 * One scripted assistant turn in the same SSE shape as the résumé agent.
 * Tool presets omit TOOL_CALL_RESULT so the real client tools run.
 */
export async function* chatLabRun(input: {
  preset: ChatLabPresetId;
  messages: unknown;
  threadId: string;
  resumeId?: string;
  signal?: AbortSignal;
}): AsyncGenerator<StreamChunk> {
  const { preset, signal } = input;
  const threadId = input.threadId || "chat-lab";
  const runId = crypto.randomUUID();
  const followUp = continuingAfterTool(input.messages);

  yield { type: EventType.RUN_STARTED, threadId, runId };

  if (preset === "calltek-stress") {
    if (!input.resumeId) {
      yield* textMessage(
        `${runId}-text`,
        "Pick a résumé in the Dev drawer first. This preset calls update_resume_details on that id.\n",
        signal,
      );
    } else {
      yield* calltekStressRun({
        runId,
        resumeId: input.resumeId,
        messages: input.messages,
        signal,
      });
    }
    if (!signal?.aborted) {
      yield { type: EventType.RUN_FINISHED, threadId, runId, finishReason: "stop" };
    }
    return;
  }

  if (followUp) {
    const closing =
      preset === "jd-draft"
        ? "The draft copy is in the library as “JD draft (chat lab)”. It was not made active. Delete it when you are done looking.\n"
        : "The client tool finished. This follow-up is still scripted: I am not reading the tool payload, only proving the round trip landed back on the workbench.\n";
    yield* textMessage(`${runId}-follow-up`, closing, signal);
    if (!signal?.aborted) {
      yield { type: EventType.RUN_FINISHED, threadId, runId, finishReason: "stop" };
    }
    return;
  }

  if (preset === "jd-draft") {
    yield* jdDraftRun(runId, signal);
  }

  if (preset === "markdown") {
    yield* textMessage(`${runId}-text`, MARKDOWN, signal);
  }

  if (preset === "who-am-i") {
    yield* textMessage(
      `${runId}-text`,
      "Hello. I will ask the library who you are, then come back with a short read.\n",
      signal,
    );
    yield* toolCall(
      `${runId}-tool`,
      "list_resumes",
      JSON.stringify({ limit: 20, offset: 0 }),
      `${runId}-text`,
    );
  }

  if (preset === "list-resumes") {
    yield* textMessage(`${runId}-text`, "Listing the résumés in this library.\n", signal);
    yield* toolCall(
      `${runId}-tool`,
      "list_resumes",
      JSON.stringify({ limit: 20, offset: 0 }),
      `${runId}-text`,
    );
  }

  if (preset === "broken-args") {
    yield* textMessage(
      `${runId}-text`,
      "I am about to send a tool call with broken arguments.\n",
      signal,
    );
    const toolCallId = `${runId}-tool`;
    yield {
      type: "TOOL_CALL_START",
      toolCallId,
      toolCallName: "get_resume",
      parentMessageId: `${runId}-text`,
    };
    yield { type: EventType.TOOL_CALL_ARGS, toolCallId, delta: '{"resumeId":' };
    yield { type: "TOOL_CALL_END", toolCallId };
    yield {
      type: EventType.RUN_ERROR,
      threadId,
      runId,
      message: "Scripted failure: tool arguments were truncated.",
      error: { message: "Scripted failure: tool arguments were truncated." },
    };
    return;
  }

  if (preset === "unknown-tool") {
    yield* textMessage(`${runId}-text`, "Calling a tool this client does not implement.\n", signal);
    yield* toolCall(`${runId}-tool`, "not_a_real_tool", JSON.stringify({}), `${runId}-text`);
  }

  if (preset === "abrupt-stop") {
    yield* textMessage(
      `${runId}-text`,
      "This reply stops in the middle. The stream closes with no RUN_FINISHED, which is the abrupt stop you can type into afterwards.\n",
      signal,
    );
    return;
  }

  if (preset === "two-tools") {
    yield* textMessage(
      `${runId}-text`,
      "Two client tools in one turn, before the run is finished.\n",
      signal,
    );
    yield* toolCall(
      `${runId}-tool-a`,
      "list_resumes",
      JSON.stringify({ limit: 8, offset: 0 }),
      `${runId}-text`,
    );
    yield* toolCall(
      `${runId}-tool-b`,
      "list_resumes",
      JSON.stringify({ limit: 5, offset: 0 }),
      `${runId}-text`,
    );
  }

  if (!signal?.aborted) {
    yield { type: EventType.RUN_FINISHED, threadId, runId, finishReason: "stop" };
  }
}
