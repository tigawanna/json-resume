import type { ResumeHandoff } from "@/features/agentic-tools/definitions/tool-context";
import type { UIMessage } from "@tanstack/ai-react";

const HANDOFF_MESSAGE_ID_PREFIX = "handoff:";

/** Prompts waiting for the résumé editor's composer, by résumé id. Read once when its AI tab mounts. */
const pendingPrompts = new Map<string, string>();

export function queueHandoffPrompt(resumeId: string, prompt: string) {
  pendingPrompts.set(resumeId, prompt);
}

export function takeHandoffPrompt(resumeId: string): string | null {
  const prompt = pendingPrompts.get(resumeId) ?? null;
  pendingPrompts.delete(resumeId);
  return prompt;
}

/** True for the marker a handoff leaves in the editor's chat; rendered as a divider, not a bubble. */
export function isHandoffMessage(message: unknown): boolean {
  return (
    typeof message === "object" &&
    message !== null &&
    "id" in message &&
    typeof message.id === "string" &&
    message.id.startsWith(HANDOFF_MESSAGE_ID_PREFIX)
  );
}

/** Back-to-back handoffs with nothing in between show as one, the latest. */
export function withoutStackedHandoffs<T>(messages: ReadonlyArray<T>): T[] {
  return messages.filter(
    (message, index) => !(isHandoffMessage(message) && isHandoffMessage(messages[index + 1])),
  );
}

/** The one line the editor's assistant reads about the handoff. */
export function handoffContext(handoff: ResumeHandoff): string {
  const started =
    handoff.mode === "copy"
      ? `The dashboard assistant copied "${handoff.baseResumeName}" into this résumé for ${handoff.jobLabel}.`
      : `The dashboard assistant picked this résumé as-is for ${handoff.jobLabel}.`;
  const job = handoff.jobAttached
    ? "The job posting is attached."
    : "The résumé still targets its previous job; the new posting is saved in the job tracker but not attached.";
  return `Context handoff. ${started} ${job}`;
}

/** The marker message that starts (or continues) the editor's chat after a handoff. */
export function buildHandoffMessage(handoff: ResumeHandoff): UIMessage {
  return {
    id: `${HANDOFF_MESSAGE_ID_PREFIX}${crypto.randomUUID()}`,
    role: "user",
    parts: [{ type: "text", content: handoffContext(handoff) }],
    createdAt: new Date(),
  };
}

/** What lands in the editor's composer: why this résumé, then the suggested next step. */
export function handoffPrompt(handoff: ResumeHandoff): string {
  const reason = handoff.reason.trim();
  return reason
    ? `Why this résumé: ${reason}\n\n${handoff.suggestedPrompt}`
    : handoff.suggestedPrompt;
}
