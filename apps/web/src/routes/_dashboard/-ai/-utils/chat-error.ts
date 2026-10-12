import { isApiKeyErrorMessage } from "./is-api-key-error";

export type ChatErrorKind = "api-key" | "daily-limit" | "rate-limit" | "timeout" | "other";

const DAILY_LIMIT_PATTERN = /per[- ]day|daily/i;
const RATE_LIMIT_PATTERN = /rate.?limit|\b429\b|too many requests|free-models-per/i;
const TIMEOUT_PATTERN =
  /time(d)?[ -]?out|\b(408|502|503|504)\b|ETIMEDOUT|ECONNRESET|socket hang up|fetch failed|network ?error|terminated|overloaded|stream (ended|closed)/i;

export function classifyChatError(message: string): ChatErrorKind {
  if (isApiKeyErrorMessage(message)) return "api-key";
  if (RATE_LIMIT_PATTERN.test(message)) {
    return DAILY_LIMIT_PATTERN.test(message) ? "daily-limit" : "rate-limit";
  }
  if (TIMEOUT_PATTERN.test(message)) return "timeout";
  return "other";
}

export const CHAT_ERROR_HINTS: Record<ChatErrorKind, string> = {
  "api-key": "OpenRouter rejected the API key.",
  "daily-limit":
    "This model's daily free limit is used up. Pick another model, or add credits on OpenRouter.",
  "rate-limit":
    "The model is rate limited. It was already retried for about a minute; wait a little and retry, or pick another model.",
  timeout: "The model took too long to answer or the connection dropped.",
  other: "The last run failed.",
};

export const CONTINUE_AFTER_ERROR_PROMPT =
  "The last run stopped with an error partway through. Continue from where you stopped.";

/** Whether the failed run got as far as a reply; if not, the prompt itself is resent. */
export function failedRunHasReply(messages: ReadonlyArray<{ role: string }>): boolean {
  const last = messages.at(-1);
  return last !== undefined && last.role !== "user";
}
