import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/** Every API error uses the same body so the web client can unwrap it once. */
export type ApiErrorBody = {
  error: {
    message: string;
    code?: string;
    issues?: unknown;
  };
};

/** JSON error body, matching `ApiErrorBody`. */
export function errorBody({
  message,
  code,
  issues,
}: {
  message: string;
  code?: string;
  issues?: unknown;
}): ApiErrorBody {
  return { error: { message, code, issues } };
}

/** Maps a thrown value to a status + JSON body, without leaking internals in prod. */
export function errorResponse({
  c,
  error,
  isProduction,
}: {
  c: Context;
  error: unknown;
  isProduction: boolean;
}) {
  if (error instanceof HTTPException) {
    const body = errorBody({
      message: error.message,
      code: error.status === 401 ? "UNAUTHORIZED" : undefined,
    });
    return c.json(body, error.status);
  }

  const message =
    isProduction || !(error instanceof Error) ? "Internal Server Error" : error.message;
  return c.json(errorBody({ message, code: "INTERNAL_ERROR" }), 500);
}
