export function isErrorThrownByRedirect(error: unknown): boolean {
  return !!(error && typeof error === "object" && "status" in error && error.status === 307);
}
