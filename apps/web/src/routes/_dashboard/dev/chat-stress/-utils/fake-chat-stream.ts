import { EventType, type StreamChunk } from "@tanstack/ai";

export type StressPersistence = "none" | "local-storage" | "local-db";

export interface ChatStressConfig {
  totalTokens: number;
  tokensPerSecond: number;
  tokensPerChunk: number;
  /** Text tokens before the stream opens a new assistant message. 0 streams one message. */
  tokensPerMessage: number;
  /** Streams a thinking block before each text message. */
  thinking: boolean;
  /** Ends each text message with an answered read-only tool call. */
  toolCalls: boolean;
}

export const DEFAULT_STRESS_CONFIG: ChatStressConfig = {
  totalTokens: 100_000,
  tokensPerSecond: 200,
  tokensPerChunk: 2,
  tokensPerMessage: 4_000,
  thinking: true,
  toolCalls: true,
};

/** Shared with the FPS monitor, which reads it once a second. */
export interface StressProgress {
  emittedTokens: number;
  startedAt: number | null;
  finishedAt: number | null;
}

const THINKING_TOKENS_PER_BLOCK = 120;
/** Counted against the budget so tool-heavy runs still end. */
const TOOL_CALL_TOKENS = 40;
/** Read-only tools, so nothing is written even if a call were ever run. */
const TOOL_NAMES = ["get_resume", "list_jobs", "search_library"] as const;

const MARKDOWN_BLOCKS = [
  "## Pass {n}: what I changed\n\n",
  "Pass {n} is a full read of the résumé against the posting, not a one-line note. I tightened the **summary** so it leads with an outcome, and moved `TypeScript` and `React` to the top of the skills list. The experience bullets now start with a verb and end with a measurable result. The older roles stay, with fewer bullets, so they support the current job instead of competing with it.\n\n",
  "The first screen is the only screen a recruiter is guaranteed to read. That means the headline uses the posting's title, the summary states what shipped and what changed, and the first bullet of the current role names the platform, the stack, and the result in one sentence. Tools the posting repeats show up there. Tools it never mentions wait until the skills list.\n\n",
  '- Rewrote the headline to match the posting\'s title, and dropped the generic "software engineer" line.\n- Cut the bullet that repeated the Playwright point. One bullet owns that story, with the suite count, not three bullets that all say "wrote tests".\n- Added numbers where the original only had adjectives, like **30% faster** start-up and a team of four.\n- Moved the volunteer section below the roles. It is real, and it is not what this posting is scoring.\n- Left every employer and every date as they were. This pass reframes. It does not invent a job.\n\n',
  "1. Lead with the action and the outcome, in the posting's words.\n2. Name the tool, the scale, or the constraint in the same sentence.\n3. Cut anything that would read the same on a colleague's résumé.\n4. Keep one testing bullet, and make it the specific one.\n5. Stop when the first screen can stand on its own.\n\n",
  "```ts\nexport function scoreBullet(bullet: string) {\n  const hasNumber = /\\d/.test(bullet);\n  const startsWithVerb = /^[A-Z][a-z]+ed\\b/.test(bullet);\n  const vague = /robust|scalable|various|multiple/.test(bullet);\n  return Number(hasNumber) + Number(startsWithVerb) - Number(vague);\n}\n```\n\n",
  "A bullet that scores zero gets rewritten or cut. A bullet that scores two can stay. A migration bullet with no number can still stay when the posting asked for migrations. The score is a filter for the vague lines, not a replacement for reading the posting.\n\n",
  "| Section | Before this pass | After this pass |\n| --- | --- | --- |\n| Headline | Generic title | The posting's title |\n| Summary | Four lines of tools | Three lines, outcome first |\n| Skills | 18 items, flat | 12 items, TypeScript and React first |\n| Current role | 7 duty bullets | 5 bullets, result at the end |\n| Older roles | As long as the current job | Half the bullets, same facts |\n\n",
  "> The posting asks for _ownership of the frontend platform_, so the first bullet of the current role now says exactly that, with the stack and the result in the same sentence. The rest of pass {n} is evidence for that sentence, not a second introduction.\n\n",
];

const THINKING_TEXT =
  "The user wants the résumé to match the posting more closely. I should read the active résumé first, compare its skills against the requirements, then rewrite the weakest bullets without inventing experience. ";

function tokenize(text: string) {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

function* markdownTokens(): Generator<string, never> {
  for (let pass = 1; ; pass++) {
    for (const block of MARKDOWN_BLOCKS) {
      yield* tokenize(block.replaceAll("{n}", String(pass)));
    }
  }
}

function* thinkingTokens(): Generator<string, never> {
  const tokens = tokenize(THINKING_TEXT);
  for (;;) yield* tokens;
}

function take(source: Generator<string, never>, count: number) {
  let text = "";
  for (let i = 0; i < count; i++) text += source.next().value;
  return text;
}

const TOOL_RESULT = JSON.stringify({
  id: "stress-resume",
  name: "Stress test résumé",
  summary: THINKING_TEXT.repeat(3),
  experience: Array.from({ length: 4 }, (_, index) => ({
    company: `Company ${index + 1}`,
    bullets: MARKDOWN_BLOCKS.slice(1, 4),
  })),
});

/** Resolves early when the run is stopped. Always waits a task, like chunks arriving over the network. */
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

/**
 * A scripted assistant run in the shape the server streams: thinking, markdown
 * text and tool calls. Paced to `tokensPerSecond` from the start of the run, so
 * a slow page shows up as tokens falling behind schedule.
 */
export async function* fakeChatRun(
  config: ChatStressConfig,
  progress: StressProgress,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const threadId = "chat-stress";
  const runId = crypto.randomUUID();
  const text = markdownTokens();
  const thoughts = thinkingTokens();
  const startedAt = performance.now();
  progress.emittedTokens = 0;
  progress.startedAt = startedAt;
  progress.finishedAt = null;

  const remaining = () => config.totalTokens - progress.emittedTokens;
  const isDone = () => remaining() <= 0 || signal?.aborted === true;
  async function pace(tokens: number) {
    progress.emittedTokens += tokens;
    const due = startedAt + (progress.emittedTokens / config.tokensPerSecond) * 1000;
    await sleep(Math.max(0, due - performance.now()), signal);
  }

  yield { type: EventType.RUN_STARTED, threadId, runId };

  for (let block = 1; !isDone(); block++) {
    if (config.thinking) {
      const stepName = `${runId}-thinking-${block}`;
      yield { type: EventType.STEP_STARTED, stepName };
      for (let sent = 0; sent < THINKING_TOKENS_PER_BLOCK && !isDone();) {
        const count = Math.min(config.tokensPerChunk, THINKING_TOKENS_PER_BLOCK - sent);
        yield {
          type: EventType.REASONING_MESSAGE_CONTENT,
          messageId: stepName,
          delta: take(thoughts, count),
        };
        sent += count;
        await pace(count);
      }
      yield { type: EventType.STEP_FINISHED, stepName };
    }

    const messageId = `${runId}-text-${block}`;
    const messageBudget = config.tokensPerMessage > 0 ? config.tokensPerMessage : Infinity;
    yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" };
    for (let sent = 0; sent < messageBudget && !isDone();) {
      const count = Math.min(config.tokensPerChunk, messageBudget - sent, remaining());
      yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: take(text, count) };
      sent += count;
      await pace(count);
    }
    yield { type: EventType.TEXT_MESSAGE_END, messageId };

    if (config.toolCalls && !isDone()) {
      const toolCallId = `${runId}-tool-${block}`;
      const args = JSON.stringify({ query: `pass ${block}`, limit: 10 });
      yield {
        type: "TOOL_CALL_START",
        toolCallId,
        toolCallName: TOOL_NAMES[block % TOOL_NAMES.length],
        parentMessageId: messageId,
      };
      for (const delta of [args.slice(0, args.length / 2), args.slice(args.length / 2)]) {
        yield { type: EventType.TOOL_CALL_ARGS, toolCallId, delta };
      }
      yield { type: "TOOL_CALL_END", toolCallId };
      yield {
        type: EventType.TOOL_CALL_RESULT,
        messageId: `${toolCallId}-result`,
        toolCallId,
        content: TOOL_RESULT,
        role: "tool",
      };
      await pace(TOOL_CALL_TOKENS);
    }
  }

  progress.finishedAt = performance.now();
  if (!signal?.aborted) {
    yield { type: EventType.RUN_FINISHED, threadId, runId, finishReason: "stop" };
  }
}
