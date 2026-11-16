export function unwrapUnknownError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}
