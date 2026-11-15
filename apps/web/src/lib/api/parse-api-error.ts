/**
 * Turn a non-ok Hono RPC response into an `Error`, using the API's standard
 * error body `{ error: { message, code? } }` (see `errorBody` in `apps/api`).
 * Falls back to `fallback` when the body does not carry a usable message.
 */
export async function parseApiError(response: Response, fallback: string): Promise<Error> {
  const body: unknown = await response.json().catch(() => undefined);

  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body;
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.length > 0
    ) {
      return new Error(error.message);
    }
  }

  return new Error(fallback);
}
