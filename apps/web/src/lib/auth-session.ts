import { auth } from "@/lib/auth";
import { unwrapUnknownError } from "@/utils/errors";
import { log as standaloneLog, type RequestLogger } from "evlog";
import { useRequest } from "nitro/context";

const SESSION_ATTEMPTS = 2;
const SESSION_TIMEOUT_MS = 3_000;
const SESSION_RETRY_DELAY_MS = 250;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Session lookup timed out"));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

type SessionLookupOutcome = "retry" | "logged_out";

function getRequestLog(): RequestLogger | null {
  try {
    const candidate = useRequest().context?.log;
    if (
      candidate &&
      typeof candidate === "object" &&
      "warn" in candidate &&
      "set" in candidate &&
      typeof candidate.warn === "function" &&
      typeof candidate.set === "function"
    ) {
      // Runtime-checked subset of RequestLogger; Nitro context types it as unknown.
      return candidate as RequestLogger;
    }
  } catch {
    // No Nitro async request context (e.g. tests / background work).
  }
  return null;
}

function captureSessionLookupFailure(fields: {
  attempt: number;
  outcome: SessionLookupOutcome;
  error: unknown;
}) {
  const errorMessage = unwrapUnknownError(fields.error).message;
  const willRetry = fields.outcome === "retry";
  const message = willRetry
    ? "Session lookup failed; retrying"
    : "Session lookup failed after retries; treating as logged out";

  const sessionLookup = {
    attempt: fields.attempt,
    maxAttempts: SESSION_ATTEMPTS,
    timeoutMs: SESSION_TIMEOUT_MS,
    willRetry,
    outcome: fields.outcome,
    error: errorMessage,
  };

  const requestLog = getRequestLog();
  if (requestLog) {
    requestLog.warn(message, { auth: { sessionLookup } });
    // Array values concatenate on set(), so each failure appends a row.
    requestLog.set({
      authSessionRetries: [
        {
          attempt: fields.attempt,
          outcome: fields.outcome,
          error: errorMessage,
        },
      ],
    });
    return;
  }

  standaloneLog.warn({
    message,
    service: "agentic-json-resume",
    ...sessionLookup,
  });
}

/** Brief retry, then soft-fail to null instead of throwing. */
export async function getSessionSafely(headers: Headers) {
  for (let attempt = 1; attempt <= SESSION_ATTEMPTS; attempt++) {
    try {
      return await withTimeout(auth.api.getSession({ headers }), SESSION_TIMEOUT_MS);
    } catch (err: unknown) {
      const willRetry = attempt < SESSION_ATTEMPTS;
      captureSessionLookupFailure({
        attempt,
        outcome: willRetry ? "retry" : "logged_out",
        error: err,
      });
      if (willRetry) {
        await delay(SESSION_RETRY_DELAY_MS);
      }
    }
  }

  return null;
}
