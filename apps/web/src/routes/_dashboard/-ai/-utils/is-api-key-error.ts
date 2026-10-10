const API_KEY_ERROR_PATTERN =
  /\b(401|403)\b|unauthori[sz]ed|forbidden|invalid[^.\n]*(api[ -]?)?key|incorrect api key|no auth credentials|user not found|api key/i;

export function isApiKeyErrorMessage(message: string | null): boolean {
  if (!message) return false;
  return API_KEY_ERROR_PATTERN.test(message);
}
