import { EventType, type StreamChunk } from "@tanstack/ai";

export const CHAT_LAB_PRESETS = [
  {
    id: "markdown",
    label: "Markdown blocks",
    detail: "Text, a list, and a code block. No tools.",
  },
  {
    id: "who-am-i",
    label: "Hello, who am I?",
    detail:
      "Calls get_profile_overview on the client, then writes a follow-up from the tool result.",
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
    detail: "Emits get_profile_overview and list_resumes before the run finishes.",
  },
] as const;

export type ChatLabPresetId = (typeof CHAT_LAB_PRESETS)[number]["id"];

export function isChatLabPreset(value: string): value is ChatLabPresetId {
  return CHAT_LAB_PRESETS.some((preset) => preset.id === value);
}

const MARKDOWN = [
  "Here is a scripted reply, with no model behind it.\n\n",
  "What I would change:\n\n",
  "- Lead the summary with an outcome.\n- Cut the bullet that repeats the Playwright point.\n- Put **TypeScript** and **React** first in skills.\n\n",
  "```ts\nexport function scoreBullet(bullet: string) {\n  const hasNumber = /\\d/.test(bullet);\n  return Number(hasNumber);\n}\n```\n\n",
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
  const tokens = text.match(/\S+\s*|\s+/g) ?? [text];
  for (const token of tokens) {
    if (signal?.aborted) return;
    yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: token };
    await sleep(16, signal);
  }
  yield { type: EventType.TEXT_MESSAGE_END, messageId };
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

/**
 * One scripted assistant turn in the same SSE shape as the résumé agent.
 * Tool presets omit TOOL_CALL_RESULT so the real client tools run.
 */
export async function* chatLabRun(input: {
  preset: ChatLabPresetId;
  messages: unknown;
  threadId: string;
  signal?: AbortSignal;
}): AsyncGenerator<StreamChunk> {
  const { preset, signal } = input;
  const threadId = input.threadId || "chat-lab";
  const runId = crypto.randomUUID();
  const followUp = continuingAfterTool(input.messages);

  yield { type: EventType.RUN_STARTED, threadId, runId };

  if (followUp) {
    yield* textMessage(
      `${runId}-follow-up`,
      "The client tool finished. This follow-up is still scripted: I am not reading the tool payload, only proving the round trip landed back on the workbench.\n",
      signal,
    );
    if (!signal?.aborted) {
      yield { type: EventType.RUN_FINISHED, threadId, runId, finishReason: "stop" };
    }
    return;
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
      "get_profile_overview",
      JSON.stringify({ limit: 20 }),
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
      "get_profile_overview",
      JSON.stringify({ limit: 8 }),
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
