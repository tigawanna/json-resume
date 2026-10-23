# Queue prompts while the AI is replying

Let the user type and send follow-ups while a reply streams. They show as pending bubbles with a cancel button and send in order once the reply finishes.

## Status: enabled on TanStack AI 1.0

Queueing was built and then turned off. The resume AI composer is disabled while a reply streams again, and `useChat` runs with `queue: "drop"` (`apps/web/src/routes/_dashboard/-ai/-hooks/use-event-sourced-resume-ai.ts`).

## Why we can't use it yet

`@tanstack/ai-client` (seen in 0.39.1, still present in 0.39.2) loses queued messages when the reply calls client tools, which almost every résumé edit does.

1. `sendMessage` → `deliverMessage` takes `deliverClaim` and runs `streamResponse`.
2. The server stops after each batch of client tool calls. In the stream's `finally`, `drainPostStreamActions` runs `checkForContinuation`, which starts the next round with a nested `streamResponse` while the outer `deliverClaim` is still held.
3. That nested stream's `finally` calls `drainQueue`. `isLoading` is false at that moment, so it `shift()`s the queued message and calls `deliverMessage`.
4. `deliverMessage` returns `false` because `deliverClaim` is held, and `drainQueue` returns without putting the message back. The prompt is gone, with no error.

Plain replies with no tool calls queue fine, which makes the bug look intermittent. Found by browser testing on Oct 12, 2026: a follow-up queued during a tailored-copy run vanished after the composer cleared.

## When a new `@tanstack/ai-client` ships

Check `drainQueue` / `deliverMessage` in `dist/esm/chat-client.js`. The fix needs one of:

- `drainQueue` bails while `deliverClaim` is held, and `sendMessage` drains after `deliverMessage` returns, or
- a failed `deliverMessage` puts the message back at the head of the queue.

Then re-enable:

- Remove `queue: "drop"` from `useChat` and the `isLoading` guards in `sendText` / `resendPastPrompt`.
- `ResumeAiPromptComposer.tsx`: keep the input and send button enabled while busy (drop the `isBusy` checks in `handleSend`, `disabled`, and the send button), use the placeholder "Queue a follow-up, it sends when this reply finishes...", and label the send button "Queue message" while busy.
- `ResumeAiMessage.tsx`: resend can stay enabled while busy.
- `resume-ai-chat-ui.tsx`: render `<Queue />` after `<Messages />` in `layout`, and add a `queue` widget that renders `item.content` with a cancel button calling `item.cancelQueued` (`data-test="resume-ai-queued-prompt"`, `resume-ai-cancel-queued`).
- `ResumeAiConversationCard.tsx`: count `chat.queue.length` when deciding if the conversation is empty, and add `chat.queue.length` to the scroll effect deps in the hook.
- `features/agentic-tools/README.md`: update the composer paragraph.

Retest in the browser: send an edit prompt (for example "tailor a copy for an AI Engineer role"), queue a follow-up while tool panels are still appearing, and confirm it sends after the reply finishes.
